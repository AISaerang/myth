"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  extractChordLines,
  layoutChordLine,
  stripChords,
  transposeContent,
  transposeRoot,
} from "@/lib/chords";

type ViewMode = "both" | "lyrics" | "chords";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "both", label: "Lirik + Chord" },
  { value: "lyrics", label: "Lirik saja" },
  { value: "chords", label: "Chord saja" },
];

function renderBoth(content: string, key: string): React.ReactNode {
  // Chord bertumpuk di atas lirik, sejajar kolom suku kata.
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const { chordLine, lyricLine, label, isEmpty } = layoutChordLine(line);
    const lineKey = `${key}-${i}`;

    if (isEmpty) {
      return <div key={lineKey} className="h-4" />;
    }
    if (label) {
      return (
        <div
          key={lineKey}
          className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 first:mt-0"
        >
          {label}
        </div>
      );
    }
    return (
      <div key={lineKey} className="overflow-x-auto overscroll-x-contain">
        <div className="w-max whitespace-pre font-mono text-sm leading-6">
          {chordLine.trim() ? (
            <div className="font-semibold text-sky-700 dark:text-sky-400">
              {chordLine}
            </div>
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
}: {
  content: string;
  baseKey: string;
}) {
  const [offset, setOffset] = useState(0);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Nada: {currentKey}</span>
        <span className="text-zinc-500">(basis {baseKey})</span>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Mode tampil">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            aria-pressed={mode === m.value}
            className={`min-h-[44px] rounded-lg px-3 text-sm font-medium ${
              mode === m.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Turunkan setengah nada"
        >
          −½
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Naikkan setengah nada"
        >
          +½
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setOffset(0);
            setUseFlats(false);
          }}
        >
          Reset ke {baseKey}
        </Button>
        <button
          type="button"
          onClick={() => setUseFlats((f) => !f)}
          aria-pressed={useFlats}
          className="min-h-[44px] rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700"
        >
          {useFlats ? "Mol (♭)" : "Kres (♯)"}
        </button>
      </div>
      <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
        {mode === "lyrics" ? (
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-7">
            {stripChords(transposed)}
          </pre>
        ) : mode === "chords" ? (
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-7">
            {extractChordLines(transposed).join("\n")}
          </pre>
        ) : (
          <div>{renderBoth(transposed, `${offset}-${useFlats}`)}</div>
        )}
      </div>
    </div>
  );
}
