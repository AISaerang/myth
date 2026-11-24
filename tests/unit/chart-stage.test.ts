import { describe, expect, it } from "vitest";
import {
  activeSectionFromVisibility,
  clampTextScale,
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

  it("labels a legacy notation-only section as Intro in the navigator", () => {
    expect(getStageSections("{Bagian 1}\n[C]1 2 3\n{Verse}\n[G]Isi")).toEqual([
      { index: 0, label: "Intro", lineIndex: 0 },
      { index: 1, label: "Verse", lineIndex: 2 },
    ]);
  });

  it("clamps stage text size to accessible limits", () => {
    expect(clampTextSize(10)).toBe(14);
    expect(clampTextSize(18)).toBe(18);
    expect(clampTextSize(30)).toBe(24);
  });

  it("clamps chart text scale to 80–200 percent in 10 percent steps", () => {
    expect(clampTextScale(70)).toBe(80);
    expect(clampTextScale(105)).toBe(110);
    expect(clampTextScale(200)).toBe(200);
    expect(clampTextScale(210)).toBe(200);
  });

  it("moves section selection without leaving bounds", () => {
    expect(moveStageSection(0, -1, 3)).toBe(0);
    expect(moveStageSection(0, 1, 3)).toBe(1);
    expect(moveStageSection(2, 1, 3)).toBe(2);
    expect(moveStageSection(0, 1, 0)).toBe(0);
  });

  it("chooses the visible section nearest the scrollspy activation line", () => {
    expect(
      activeSectionFromVisibility([
        { index: 0, isIntersecting: true },
        { index: 1, isIntersecting: true },
        { index: 2, isIntersecting: false },
      ]),
    ).toBe(1);
    expect(
      activeSectionFromVisibility([
        { index: 0, isIntersecting: false },
      ]),
    ).toBeNull();
  });
});
