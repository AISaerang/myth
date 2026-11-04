"use client";

import { useMemo, useState } from "react";
import { KeyTransposeBar } from "@/components/KeyTransposeBar";
import { NotationLine, NotAngka } from "@/components/NotAngka";
import { transposeRoot, transposeSpacedChords } from "@/lib/chords";
import { alignChordsToNotation, formatTransposeFormula } from "@/lib/jianpu-align";
import { keyToFormula, parseJianpu } from "@/lib/jianpu";

// Blok intro di halaman lagu: layout yang sama dengan baris not angka di chart.
// Kunci disimpan basis C dan ikut kontrol transpose; angka (do = 1) tetap.
export function IntroStaff({
  chords,
  notation,
  note,
  songKey,
  baseKey = "C",
  initialOffset = 0,
}: {
  chords: string;
  notation: string;
  note?: string | null;
  songKey?: string | null;
  baseKey?: string;
  initialOffset?: number;
}) {
  const [offset, setOffset] = useState(initialOffset);
  const [useFlats, setUseFlats] = useState(false);
  const currentKey = transposeRoot(baseKey, offset, useFlats);
  const formula = formatTransposeFormula(baseKey, currentKey);
  const songFormula = songKey ? keyToFormula(songKey) : "";
  const transposedChords = useMemo(
    () => transposeSpacedChords(chords, offset, useFlats),
    [chords, offset, useFlats],
  );
  const lines = notation.replace(/\r\n/g, "\n").split("\n");
  const hasNotation = lines.some((line) => line.trim() !== "");

  return (
    <div className="flex flex-col gap-3">
      <KeyTransposeBar
        baseKey={baseKey}
        offset={offset}
        useFlats={useFlats}
        formula={hasNotation || chords.trim() ? formula : undefined}
        onOffset={setOffset}
        onFlats={setUseFlats}
        onReset={() => {
          setOffset(0);
          setUseFlats(false);
        }}
      />
      {songKey ? (
        <p className="text-xs text-zinc-500">
          Kunci lagu: {songKey}
          {songFormula ? ` · ${songFormula}` : ""}
        </p>
      ) : null}
      {hasNotation ? (
        <div className="flex flex-col gap-2">
          {lines.map((line, index) => {
            if (!line.trim()) return <div key={index} className="h-2" />;
            const parsed = parseJianpu(line);
            if (!parsed.valid) return <NotAngka key={index} value={line} />;
            const aligned = alignChordsToNotation(index === 0 ? transposedChords : "", line);
            if (!aligned) return <NotAngka key={index} value={line} />;
            return (
              <div key={index} className="max-w-full overflow-x-auto overscroll-x-contain">
                <NotationLine alignment={aligned} />
              </div>
            );
          })}
        </div>
      ) : transposedChords.trim() ? (
        <p className="font-mono text-sm font-semibold text-sky-700 dark:text-sky-400">
          {transposedChords}
        </p>
      ) : null}
      {note ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{note}</p>
      ) : null}
    </div>
  );
}
