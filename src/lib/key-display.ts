import { semitonesBetween, transposeRoot } from "@/lib/chords";

export function keyOffsetFromC(key: string | null | undefined): number {
  if (!key?.trim()) return 0;
  return semitonesBetween("C", key.trim());
}

export interface SectionOffsetInput {
  baseKey?: string | null;
  modulationSemitones?: number;
  songId?: string;
}

export function sectionOffsets(
  sections: readonly SectionOffsetInput[],
  songKey: string | null | undefined,
  viewerOffset: number,
  resetToC: boolean,
): number[] {
  const cumulativeBySong = new Map<string, number>();
  return sections.map((section) => {
    const songId = section.songId ?? "";
    const cumulative = cumulativeBySong.get(songId) ?? 0;
    const baseOffset = resetToC
      ? 0
      : keyOffsetFromC(section.baseKey ?? songKey);
    const offset = baseOffset + viewerOffset + cumulative;
    cumulativeBySong.set(
      songId,
      cumulative + (section.modulationSemitones ?? 0),
    );
    return offset;
  });
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
