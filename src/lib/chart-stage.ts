import { layoutChordLine } from "@/lib/chords";
import { displaySectionLabel } from "@/lib/chart-arrangement";

export interface StageSection {
  index: number;
  label: string;
  lineIndex: number;
}

export interface SectionVisibility {
  index: number;
  isIntersecting: boolean;
}

export function activeSectionFromVisibility(
  sections: readonly SectionVisibility[],
): number | null {
  const visible = sections
    .filter((section) => section.isIntersecting)
    .sort((left, right) => left.index - right.index);
  return visible.at(-1)?.index ?? null;
}

export function getStageSections(content: string): StageSection[] {
  const lines = content.split("\n");
  const sections = lines.flatMap((line, lineIndex) => {
    const { label } = layoutChordLine(line);
    if (!label) return [];
    return [{ label, lineIndex }];
  });
  return sections.map((section, index) => {
    const nextSectionLine = sections[index + 1]?.lineIndex ?? lines.length;
    return {
      index,
      label: displaySectionLabel(section.label, {
        content: lines.slice(section.lineIndex + 1, nextSectionLine).join("\n"),
      }),
      lineIndex: section.lineIndex,
    };
  });
}

export function clampTextSize(size: number): number {
  return Math.min(24, Math.max(14, size));
}

export function clampTextScale(scale: number): number {
  const stepped = Math.round(scale / 10) * 10;
  return Math.min(200, Math.max(80, stepped));
}

export function moveStageSection(
  current: number,
  direction: -1 | 1,
  sectionCount: number,
): number {
  if (sectionCount <= 0) return 0;
  return Math.min(sectionCount - 1, Math.max(0, current + direction));
}
