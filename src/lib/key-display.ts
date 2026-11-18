import { semitonesBetween, transposeRoot } from "@/lib/chords";

export function keyOffsetFromC(key: string | null | undefined): number {
  if (!key?.trim()) return 0;
  return semitonesBetween("C", key.trim());
}

export function displayKey(
  baseKey: string | null | undefined,
  semitones: number,
  useFlats = false,
): string {
  const key = baseKey?.trim() || "C";
  return transposeRoot(key, semitones, useFlats);
}

export function formatKeyChange(
  key: string,
  semitones: number,
  useFlats = false,
): string {
  if (semitones === 0) return `${key} (tanpa modulasi)`;
  const target = displayKey(key, semitones, useFlats);
  const magnitude = Math.abs(semitones);
  return `${key} ${semitones > 0 ? "+" : "-"} ${magnitude} = ${target}`;
}
