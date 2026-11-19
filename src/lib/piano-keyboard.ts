import { clampPitch, parsePitch } from "@/lib/pitch";

const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const pitchClass = ((midi % 12) + 12) % 12;
  return `${PITCH_NAMES[pitchClass]}${octave}`;
}

export interface PianoKeyboardKey {
  midi: number;
  note: string | null;
  black: boolean;
}

export function buildPianoKeyboard(
  notes: readonly string[],
  start: string,
  end?: string,
): PianoKeyboardKey[] {
  const startMidi = parsePitch(start);
  const endMidi = end ? parsePitch(end) : startMidi + 24;
  const notesByMidi = new Map<number, string>();
  for (const note of notes) {
    const clamped = clampPitch(note, start, end ?? midiName(endMidi));
    const midi = parsePitch(clamped);
    if (midi >= startMidi && midi <= endMidi) {
      notesByMidi.set(midi, clamped);
    }
  }
  return Array.from({ length: endMidi - startMidi + 1 }, (_, index) => {
    const midi = startMidi + index;
    const pitchClass = ((midi % 12) + 12) % 12;
    return {
      midi,
      note: notesByMidi.get(midi) ?? null,
      black: [1, 3, 6, 8, 10].includes(pitchClass),
    };
  });
}
