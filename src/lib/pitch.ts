import { noteIndex, transposeRoot } from "@/lib/chords";

export const RH_MIN = "A3";
export const RH_MAX = "C5";
export const LH_MIN = "E1";
export const LH_MAX = "C3";

interface ParsedPitch {
  midi: number;
  letter: string;
  accidental: string;
}

function parsePitchParts(name: string): ParsedPitch {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim());
  if (!match) throw new Error(`Nada tidak valid: ${name}`);
  const letter = (match[1] ?? "").toUpperCase();
  const accidental = match[2] ?? "";
  const octave = Number(match[3]);
  if (!Number.isInteger(octave) || octave < -1 || octave > 9) {
    throw new Error(`Oktaf tidak valid: ${name}`);
  }
  const pitchClass = noteIndex(`${letter}${accidental}`);
  return {
    midi: (octave + 1) * 12 + pitchClass,
    letter,
    accidental,
  };
}

function midiName(midi: number, flats: boolean): string {
  const octave = Math.floor(midi / 12) - 1;
  const pitchClass = ((midi % 12) + 12) % 12;
  const root = transposeRoot("C", pitchClass, flats);
  return `${root}${octave}`;
}

export function parsePitch(name: string): number {
  return parsePitchParts(name).midi;
}

export function transposePitch(
  name: string,
  semitones: number,
  useFlats?: boolean,
): string {
  if (!Number.isInteger(semitones)) {
    throw new Error("Transposisi nada harus bilangan bulat.");
  }
  const pitch = parsePitchParts(name);
  const flats =
    useFlats ??
    (pitch.accidental === "b"
      ? true
      : pitch.accidental === "#"
        ? false
        : false);
  return midiName(pitch.midi + semitones, flats);
}

export function clampPitch(name: string, min: string, max: string): string {
  let pitch = parsePitch(name);
  const lower = parsePitch(min);
  const upper = parsePitch(max);
  if (lower > upper) throw new Error("Batas nada minimum melebihi maksimum.");

  while (pitch < lower) {
    const next = pitch + 12;
    if (next > upper) {
      return Math.abs(pitch - lower) <= Math.abs(next - upper) ? min : max;
    }
    pitch = next;
  }
  while (pitch > upper) {
    const next = pitch - 12;
    if (next < lower) {
      return Math.abs(pitch - upper) <= Math.abs(next - lower) ? max : min;
    }
    pitch = next;
  }
  return midiName(pitch, false);
}
