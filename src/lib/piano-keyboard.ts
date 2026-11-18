import { parsePitch } from "@/lib/pitch";

export interface PianoKeyboardKey {
  midi: number;
  note: string | null;
  black: boolean;
}

export function buildPianoKeyboard(
  notes: readonly string[],
  start: string,
): PianoKeyboardKey[] {
  const startMidi = parsePitch(start);
  const notesByMidi = new Map<number, string>();
  for (const note of notes) {
    const midi = parsePitch(note);
    if (midi < startMidi || midi >= startMidi + 24) {
      throw new Error(`Nada ${note} berada di luar keyboard dua oktaf.`);
    }
    notesByMidi.set(midi, note);
  }
  return Array.from({ length: 24 }, (_, index) => {
    const midi = startMidi + index;
    const pitchClass = ((midi % 12) + 12) % 12;
    return {
      midi,
      note: notesByMidi.get(midi) ?? null,
      black: [1, 3, 6, 8, 10].includes(pitchClass),
    };
  });
}
