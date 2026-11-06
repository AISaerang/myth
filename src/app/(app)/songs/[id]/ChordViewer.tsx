"use client";

import { useMemo, useState } from "react";
import { KeyTransposeBar } from "@/components/KeyTransposeBar";
import { NotationLine } from "@/components/NotAngka";
import { NotationSymbolGuide } from "@/components/NotationSymbolGuide";
import {
  extractChordLines,
  layoutChordLine,
  transposeContent,
  transposeRoot,
} from "@/lib/chords";
import { displaySectionLabel } from "@/lib/chart-arrangement";
import {
  alignChordsToNotation,
  contentHasNotation,
  formatTransposeFormula,
  notationLineError,
} from "@/lib/jianpu-align";

type ViewMode = "both" | "lyrics" | "chords";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "both", label: "Lirik + Chord" },
  { value: "lyrics", label: "Lirik saja" },
  { value: "chords", label: "Chord saja" },
];

// Baris komentar ChordPro (`# ...`), dipakai catatan intro yang sudah
// menjadi bagian chart. Bukan label bagian dan bukan not angka.
function chartComment(line: string): string | null {
  if (/[\[{]/.test(line)) return null;
  const match = /^\s*#(.*)$/.exec(line);
  if (!match) return null;
  return (match[1] ?? "").trim();
}

function sectionLabelAt(lines: string[], index: number): string | null {
  const layout = layoutChordLine(lines[index] ?? "");
  if (!layout.label) return null;
  const body: string[] = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (layoutChordLine(lines[cursor] ?? "").label) break;
    body.push(lines[cursor] ?? "");
  }
  return displaySectionLabel(layout.label, { content: body.join("\n") });
}

function renderChart(
  content: string,
  mode: ViewMode,
  key: string,
  noteCountsByLabel?: Record<string, number>,
) {
  const lines = content.split("\n");
  return lines.map((line, index) => {
    const lineKey = `${key}-${index}`;
    const comment = chartComment(line);
    if (comment !== null) {
      if (!comment) return <div key={lineKey} className="h-2" />;
      return (
        <p
          key={lineKey}
          data-chart-comment=""
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          {comment}
        </p>
      );
    }

    const shownLabel = sectionLabelAt(lines, index);
    const noteCount = shownLabel ? noteCountsByLabel?.[shownLabel] : undefined;

    if (mode === "chords") {
      if (shownLabel) {
        return (
          <pre
            key={lineKey}
            data-section-label={shownLabel}
            className="overflow-x-auto font-mono text-sm leading-7 whitespace-pre-wrap"
          >
            {`— ${shownLabel}${noteCount ? ` · ${noteCount} catatan` : ""} —`}
          </pre>
        );
      }
      const extracted = extractChordLines(line)[0] ?? "";
      if (!extracted.trim()) return <div key={lineKey} className="h-2" />;
      return (
        <pre
          key={lineKey}
          className="overflow-x-auto font-mono text-sm leading-7 whitespace-pre-wrap"
        >
          {extracted}
        </pre>
      );
    }

    const { chordLine, lyricLine, label, isEmpty } = layoutChordLine(line);
    if (isEmpty) return <div key={lineKey} className="h-4" />;
    if (label) {
      const shown = shownLabel ?? label;
      return (
        <div
          key={lineKey}
          data-section-label={shown}
          className={`mt-3 text-xs font-semibold tracking-wide text-zinc-500 first:mt-0 ${
            shown === "Intro" ? "normal-case" : "uppercase"
          }`}
        >
          {shown}
          {noteCount ? (
            <span className="ml-2 font-normal normal-case text-zinc-500">
              · {noteCount} catatan
            </span>
          ) : null}
        </div>
      );
    }

    const aligned = alignChordsToNotation(
      mode === "lyrics" ? "" : chordLine,
      lyricLine,
    );
    if (aligned) {
      return (
        <div key={lineKey} className="max-w-full overflow-x-auto overscroll-x-contain">
          <NotationLine alignment={aligned} />
        </div>
      );
    }

    if (mode === "lyrics") {
      return (
        <pre
          key={lineKey}
          className="overflow-x-auto font-mono text-sm leading-7 whitespace-pre-wrap"
        >
          {lyricLine.trimEnd()}
        </pre>
      );
    }

    // Baris "kelihatan not angka" tapi gagal align: jangan diam-diam mentah —
    // tampilkan alasan parser supaya MD tahu chart-nya perlu dirapikan.
    const notationError = notationLineError(lyricLine);
    if (notationError || looksLikeNoteLine(lyricLine)) {
      return (
        <div key={lineKey} className="overflow-x-auto overscroll-x-contain">
          <div className="w-max font-mono text-sm leading-6 whitespace-pre">
            {chordLine.trim() ? (
              <div className="font-semibold text-sky-700 dark:text-sky-400">{chordLine}</div>
            ) : null}
            {lyricLine.trim() ? <div>{lyricLine}</div> : null}
          </div>
          <p
            data-notation-error=""
            className="mt-1 text-xs text-red-600 dark:text-red-400"
          >
            Baris ini terlihat seperti not angka tapi gagal dirender
            {notationError ? `: ${notationError}` : ", periksa pola nada 0–7."}
          </p>        </div>
      );
    }

    return (
      <div key={lineKey} className="overflow-x-auto overscroll-x-contain">
        <div className="w-max font-mono text-sm leading-6 whitespace-pre">
          {chordLine.trim() ? (
            <div className="font-semibold text-sky-700 dark:text-sky-400">{chordLine}</div>
          ) : null}
          {lyricLine.trim() ? <div>{lyricLine}</div> : null}
        </div>
      </div>
    );
  });
}

// Heuristik lokal "kelihatan notasi": angka 0-7 dengan tanda khas
// `' , . ( ) [ ] # -`. Baris lirik biasa tetap jatuh ke cabang mentah.
const NOTE_LOOK_RE = /^[#b(){}\[\]|.'’,0-9\s-]*$/;

function looksLikeNoteLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /[0-9]/.test(trimmed) && NOTE_LOOK_RE.test(trimmed);
}

/** Isi chart tanpa kontrol transpose, supaya rumus nada tidak diulang per bagian. */
export function ChartBody({
  content,
  mode = "both",
  renderKey,
  noteCountsByLabel,
}: {
  content: string;
  mode?: ViewMode;
  renderKey: string;
  noteCountsByLabel?: Record<string, number>;
}) {
  return (
    <>{renderChart(content, mode, renderKey, noteCountsByLabel)}</>
  );
}

export function ChordViewer({
  content,
  baseKey,
  initialOffset = 0,
  noteCountsByLabel,
}: {
  content: string;
  baseKey: string;
  initialOffset?: number;
  noteCountsByLabel?: Record<string, number>;
}) {
  const [offset, setOffset] = useState(initialOffset);
  const [useFlats, setUseFlats] = useState(false);
  const [mode, setMode] = useState<ViewMode>("both");

  const transposed = useMemo(
    () => transposeContent(content, offset, useFlats),
    [content, offset, useFlats],
  );
  const currentKey = useMemo(
    () => transposeRoot(baseKey, offset, useFlats),
    [baseKey, offset, useFlats],
  );
  const hasNotation = useMemo(() => contentHasNotation(content), [content]);
  const formula = hasNotation ? formatTransposeFormula(baseKey, currentKey) : "";

  return (
    <div className="flex flex-col gap-3">
      <div data-chart-controls="">
        <KeyTransposeBar
          baseKey={baseKey}
          offset={offset}
          useFlats={useFlats}
          formula={formula || undefined}
          onOffset={setOffset}
          onFlats={setUseFlats}
          onReset={() => {
            setOffset(0);
            setUseFlats(false);
          }}
        />
        <div className="mt-2">
          <NotationSymbolGuide compact />
        </div>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Mode tampil">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMode(item.value)}
            aria-pressed={mode === item.value}
            className={`min-h-[44px] rounded-lg px-3 text-sm font-medium ${
              mode === item.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div data-chart-body="" className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
        <ChartBody
          content={transposed}
          mode={mode}
          renderKey={`${offset}-${useFlats}-${mode}`}
          noteCountsByLabel={noteCountsByLabel}
        />
      </div>
    </div>
  );
}
