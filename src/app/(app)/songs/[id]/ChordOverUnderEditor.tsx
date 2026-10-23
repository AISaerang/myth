"use client";

import { useEffect, useMemo, useState } from "react";
import {
  chordProToOverUnder,
  overUnderToChordPro,
} from "@/lib/chords";

type EditMode = "stacked" | "source";

const textareaClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm leading-6 dark:border-zinc-700 dark:bg-zinc-900";

// Editor kunci & lirik: default tampil seperti hasil render (kunci di atas
// lirik, font monospace), lalu dikonversi ke ChordPro saat masuk ke server.
// Format tersimpan tetap ChordPro — komponen ini hanya lapisan editing.
export function ChordOverUnderEditor({
  id,
  name,
  defaultValue = "",
  rows = 14,
  heading,
  hint,
  onChange,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  heading: string;
  hint?: string;
  onChange?: (chordPro: string) => void;
}) {
  const [mode, setMode] = useState<EditMode>("stacked");
  const [stacked, setStacked] = useState<string>(() =>
    chordProToOverUnder(defaultValue),
  );
  const [source, setSource] = useState<string>(defaultValue);

  const chordProValue = useMemo(
    () => (mode === "stacked" ? overUnderToChordPro(stacked) : source),
    [mode, stacked, source],
  );

  useEffect(() => {
    onChange?.(chordProValue);
  }, [chordProValue, onChange]);

  function switchMode(next: EditMode) {
    if (next === mode) return;
    if (mode === "stacked") setSource(chordProValue);
    else setStacked(chordProToOverUnder(source));
    setMode(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{heading}</p>
        <div className="flex gap-1" role="group" aria-label="Mode edit">
          <button
            type="button"
            onClick={() => switchMode("stacked")}
            aria-pressed={mode === "stacked"}
            className={`min-h-[36px] rounded-lg px-2 text-xs font-medium ${
              mode === "stacked"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            Kunci di atas lirik
          </button>
          <button
            type="button"
            onClick={() => switchMode("source")}
            aria-pressed={mode === "source"}
            className={`min-h-[36px] rounded-lg px-2 text-xs font-medium ${
              mode === "source"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            Teks ChordPro
          </button>
        </div>
      </div>
      {mode === "stacked" ? (
        <textarea
          id={id}
          value={stacked}
          rows={rows}
          onChange={(event) => setStacked(event.target.value)}
          placeholder={"G        D/F#\nBapa sentuh hati-ku"}
          className={`${textareaClass} overflow-x-auto`}
        />
      ) : (
        <textarea
          id={id}
          value={source}
          rows={rows}
          onChange={(event) => setSource(event.target.value)}
          placeholder={"[G]Bapa sentuh ha[D/F#]tiku"}
          className={`${textareaClass} overflow-x-auto`}
        />
      )}
      <p className="text-xs text-zinc-500">
        {hint ?? "Kunci ditulis di baris di atas lirik; gunakan spasi untuk mengatur posisinya."}
        {" "}
        Tempel dari internet boleh dalam format ini maupun ChordPro.
      </p>
      <input type="hidden" name={name} value={chordProValue} />
    </div>
  );
}
