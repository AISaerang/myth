"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  extractChordLines,
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
  // Render inline [Chord] sebagai chip di atas teks (blok per baris).
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={`${key}-${i}`}>
          <ChordLine line={line} />
          {"\n"}
        </span>
      ))}
    </>
  );
}

function ChordLine({ line }: { line: string }) {
  const parts = line.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[([^\]]+)\]$/.exec(part);
        if (m) {
          return (
            <code
              key={i}
              className="mx-0.5 rounded bg-zinc-200 px-1 font-semibold text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
            >
              {m[1]}
            </code>
          );
        }
        // Label seksi {Reff} tampil redup.
        const label = /^\{([^}]+)\}$/.exec(part.trim());
        if (label && part.trim().startsWith("{")) {
          return (
            <span key={i} className="text-zinc-500">
              {label[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
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
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 font-mono text-sm leading-7 dark:bg-zinc-900">
        {mode === "lyrics"
          ? stripChords(transposed)
          : mode === "chords"
            ? extractChordLines(transposed).join("\n")
            : renderBoth(transposed, `${offset}-${useFlats}`)}
      </pre>
    </div>
  );
}
