import { layoutChordLine } from "@/lib/chords";

export interface StageSection {
  index: number;
  label: string;
  lineIndex: number;
}

export function getStageSections(content: string): StageSection[] {
  let sectionIndex = 0;
  return content.split("\n").flatMap((line, lineIndex) => {
    const { label } = layoutChordLine(line);
    if (!label) return [];
    return [{ index: sectionIndex++, label, lineIndex }];
  });
}

export function clampTextSize(size: number): number {
  return Math.min(24, Math.max(14, size));
}

export function moveStageSection(
  current: number,
  direction: -1 | 1,
  sectionCount: number,
): number {
  if (sectionCount <= 0) return 0;
  return Math.min(sectionCount - 1, Math.max(0, current + direction));
}
