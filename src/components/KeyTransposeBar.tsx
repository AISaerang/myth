"use client";

import { Button } from "@/components/ui/Button";
import { transposeRoot } from "@/lib/chords";

export function KeyTransposeBar({
  baseKey,
  offset,
  useFlats,
  formula,
  onOffset,
  onFlats,
  onReset,
  showResetButton = true,
}: {
  baseKey: string;
  offset: number;
  useFlats: boolean;
  formula?: string;
  onOffset: (next: number) => void;
  onFlats: (next: boolean) => void;
  onReset: () => void;
  showResetButton?: boolean;
}) {
  const currentKey = transposeRoot(baseKey, offset, useFlats);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">Nada: {currentKey}</span>
        <span className="text-[color:var(--chart-muted)]">(basis {baseKey})</span>
        {formula ? (
          <span
            className="font-mono text-[color:var(--chart-muted)]"
            data-key-formula=""
          >
            {formula}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOffset(offset - 1)}
          aria-label="Turunkan setengah nada"
        >
          −½
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOffset(offset + 1)}
          aria-label="Naikkan setengah nada"
        >
          +½
        </Button>
        {showResetButton ? (
          <Button type="button" variant="secondary" size="sm" onClick={onReset}>
            Reset ke {baseKey}
          </Button>
        ) : null}
        <button
          type="button"
          onClick={() => onFlats(!useFlats)}
          aria-pressed={useFlats}
          className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm"
        >
          {useFlats ? "Mol (♭)" : "Kres (♯)"}
        </button>
      </div>
    </div>
  );
}
