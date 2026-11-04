"use client";

import { useMemo, useState } from "react";
import { KeyTransposeBar } from "@/components/KeyTransposeBar";
import { NotationLine } from "@/components/NotAngka";
import {
  extractChordLines,
  layoutChordLine,
  transposeContent,
  transposeRoot,
} from "@/lib/chords";
import {
  alignChordsToNotation,
  contentHasNotation,
  formatTransposeFormula,
} from "@/lib/jianpu-align";

type ViewMode = "both" | "lyrics" | "chords";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "both", label: "Lirik + Chord" },
  { value: "lyrics", label: "Lirik saja" },
  { value: "chords", label: "Chord saja" },
];

function renderChart(content: string, mode: ViewMode, key: string) {
  if (mode === "chords") {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-7">
        {extractChordLines(content).join("\n")}
      </pre>
    );
  }

  return content.split("\n").map((line, index) => {
    const { chordLine, lyricLine, label, isEmpty } = layoutChordLine(line);
    const lineKey = `${key}-${index}`;
    if (isEmpty) return <div key={lineKey} className="h-4" />;
    if (label) {
      return (
        <div
          key={lineKey}
          className="mt-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase first:mt-0"
        >
          {label}
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

export function ChordViewer({
  content,
  baseKey,
  initialOffset = 0,
}: {
  content: string;
  baseKey: string;
  initialOffset?: number;
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
      <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
        {renderChart(transposed, mode, `${offset}-${useFlats}-${mode}`)}
      </div>
    </div>
  );
}
