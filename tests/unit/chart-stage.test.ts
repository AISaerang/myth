import { describe, expect, it } from "vitest";
import {
  clampTextSize,
  getStageSections,
  moveStageSection,
} from "../../src/lib/chart-stage";

describe("chart stage helpers", () => {
  it("extracts numbered section labels in chart order", () => {
    const sections = getStageSections(
      "{Verse}\n[G]Bapa [C]sentuh\n{Chorus}\n[D]Hati-ku",
    );

    expect(sections).toEqual([
      { index: 0, label: "Verse", lineIndex: 0 },
      { index: 1, label: "Chorus", lineIndex: 2 },
    ]);
  });

  it("keeps repeated sections and ignores empty blocks", () => {
    const sections = getStageSections(
      "{Verse}\n\n[C]Isi\n{Verse}\n[G]Ulang",
    );

    expect(sections.map((section) => section.label)).toEqual([
      "Verse",
      "Verse",
    ]);
  });

  it("clamps stage text size to accessible limits", () => {
    expect(clampTextSize(10)).toBe(14);
    expect(clampTextSize(18)).toBe(18);
    expect(clampTextSize(30)).toBe(24);
  });

  it("moves section selection without leaving bounds", () => {
    expect(moveStageSection(0, -1, 3)).toBe(0);
    expect(moveStageSection(0, 1, 3)).toBe(1);
    expect(moveStageSection(2, 1, 3)).toBe(2);
    expect(moveStageSection(0, 1, 0)).toBe(0);
  });
});
