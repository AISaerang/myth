import type { PianoVoicing as PianoVoicingData } from "@/lib/instrument-voicings";
import { LH_MAX, LH_MIN, RH_MAX, RH_MIN } from "@/lib/pitch";
import { buildPianoKeyboard } from "@/lib/piano-keyboard";

function keyboard(
  notes: string[],
  start: string,
  hand: "Kiri" | "Kanan",
  tone: "sky" | "amber",
) {
  const end = hand === "Kiri" ? LH_MAX : RH_MAX;
  const keys = buildPianoKeyboard(notes, start, end);
  const color =
    tone === "sky"
      ? "bg-sky-200 text-sky-950 ring-sky-700 dark:bg-sky-800 dark:text-white"
      : "bg-amber-200 text-amber-950 ring-amber-700 dark:bg-amber-700 dark:text-white";

  const whiteKeys = keys.filter((key) => !key.black);
  const blackKeyLeft = (key: (typeof keys)[number]) => {
    const precedingWhite = keys
      .slice(0, keys.indexOf(key))
      .filter((item) => !item.black).length;
    return ((precedingWhite / whiteKeys.length) * 100) - (2.5 / whiteKeys.length);
  };

  return (
    <div
      role="img"
      aria-label={`Piano ${hand.toLowerCase()}: ${notes.join(" ") || "belum ada voicing"}`}
      className="overflow-x-auto"
    >
      <div className="relative h-10 min-w-[220px] rounded border border-zinc-400">
        <div className="flex h-full">
          {whiteKeys.map((key) => (
            <div
              key={key.midi}
              aria-hidden="true"
              className={`flex h-full flex-1 items-end justify-center border-r border-zinc-300 text-[8px] last:border-r-0 ${
                key.note
                  ? `ring-2 ring-inset ${color}`
                  : "bg-white text-zinc-700 dark:bg-zinc-100"
              }`}
              title={key.note ?? undefined}
            >
              {key.note ?? ""}
            </div>
          ))}
        </div>
        {keys.filter((key) => key.black).map((key) => {
          const left = blackKeyLeft(key);
          return (
            <div
              key={key.midi}
              aria-hidden="true"
              className={`absolute top-0 h-6 w-[7%] min-w-[14px] border border-zinc-900 text-center text-[7px] ${
                key.note ? `ring-2 ring-inset ${color}` : "bg-zinc-800 text-zinc-100"
              }`}
              style={{ left: `${left}%` }}
              title={key.note ?? undefined}
            >
              {key.note ?? ""}
            </div>
          );
        })}
      </div>
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
