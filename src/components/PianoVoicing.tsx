import type { PianoVoicing as PianoVoicingData } from "@/lib/instrument-voicings";
import { parsePitch, LH_MIN, RH_MIN } from "@/lib/pitch";

function keyboard(
  notes: string[],
  start: string,
  hand: "Kiri" | "Kanan",
  tone: "sky" | "amber",
) {
  const startMidi = parsePitch(start);
  const notesByMidi = new Map(notes.map((note) => [parsePitch(note), note]));
  const keys = Array.from({ length: 24 }, (_, index) => {
    const midi = startMidi + index;
    const note = notesByMidi.get(midi);
    const pitchClass = ((midi % 12) + 12) % 12;
    const black = [1, 3, 6, 8, 10].includes(pitchClass);
    return { midi, note, black };
  });
  const color =
    tone === "sky"
      ? "bg-sky-200 text-sky-950 ring-sky-700 dark:bg-sky-800 dark:text-white"
      : "bg-amber-200 text-amber-950 ring-amber-700 dark:bg-amber-700 dark:text-white";

  return (
    <div
      role="img"
      aria-label={`Piano ${hand.toLowerCase()}: ${notes.join(" ") || "belum ada voicing"}`}
      className="grid grid-cols-12 overflow-hidden rounded border border-zinc-400"
    >
      {keys.map(({ midi, note, black }, index) => (
        <div
          key={midi}
          aria-hidden="true"
          className={`flex h-8 min-w-0 items-end justify-center border-r border-zinc-300 text-[8px] last:border-r-0 ${
            black
              ? "bg-zinc-800 text-zinc-100"
              : "bg-white text-zinc-700 dark:bg-zinc-100"
          } ${index === 12 ? "border-l-2 border-l-zinc-600" : ""} ${
            note ? `ring-2 ring-inset ${color}` : ""
          }`}
          title={note}
        >
          {note ?? ""}
        </div>
      ))}
    </div>
  );
}

export function PianoVoicing({
  chord,
  voicing,
  compact = false,
}: {
  chord: string;
  voicing: PianoVoicingData;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      className={`min-w-0 ${compact ? "w-56" : "w-full max-w-md"}`}
      aria-label={`Piano: ${chord}, kiri ${voicing.lh.join(" ")}, kanan ${voicing.rh.join(" ")}`}
    >
      <div className="flex flex-col gap-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold">Kiri</p>
          {keyboard(voicing.lh, LH_MIN, "Kiri", "sky")}
          <p className="mt-1 text-xs">{voicing.lh.join(" ") || "Voicing belum ada"}</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold">Kanan</p>
          {keyboard(voicing.rh, RH_MIN, "Kanan", "amber")}
          <p className="mt-1 text-xs">{voicing.rh.join(" ") || "Voicing belum ada"}</p>
        </div>
      </div>
    </div>
  );
}
