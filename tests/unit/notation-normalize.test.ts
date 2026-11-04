import { describe, expect, it } from "vitest";
import { formatNotationDiff, planNotationNormalization } from "@/lib/notation-normalize";

describe("planNotationNormalization", () => {
  it("rewrites leading dots and renames a notation Bagian to Intro", () => {
    const plan = planNotationNormalization({
      title: "Contoh",
      introNotation: ".6 .7 1",
      sections: [
        {
          id: "sec-intro",
          label: "Bagian 1",
          type: "OTHER",
          content: "[C]1 1 5 .7\n[Am].6 5/",
        },
        {
          id: "sec-verse",
          label: "Verse",
          type: "VERSE",
          content: "[G]Bapa . sentuh",
        },
      ],
      overrides: [
        { id: "item-1", sectionId: "sec-intro", labelOverride: "Bagian 1" },
      ],
    });
    expect(plan).not.toBeNull();
    if (!plan) return;
    expect(plan.introNotation).toEqual({ before: ".6 .7 1", after: "6, 7, 1" });
    expect(plan.sections).toEqual([
      {
        id: "sec-intro",
        labelBefore: "Bagian 1",
        labelAfter: "Intro",
        typeBefore: "OTHER",
        typeAfter: "INTRO",
        contentBefore: "[C]1 1 5 .7\n[Am].6 5/",
        contentAfter: "[C]1 1 5 7,\n[Am]6, 5/",
      },
    ]);
    expect(plan.overrides).toEqual([
      { id: "item-1", sectionId: "sec-intro", before: "Bagian 1", after: null },
    ]);
    const diff = formatNotationDiff(plan);
    expect(diff).toContain("- Contoh");
    expect(diff).toContain("- .6 .7 1");
    expect(diff).toContain("+ 6, 7, 1");
    expect(diff).toContain("- label: Bagian 1");
    expect(diff).toContain("+ label: Intro");
    expect(diff).toContain("- type: OTHER");
    expect(diff).toContain("+ type: INTRO");
    expect(diff).toContain("+ [C]1 1 5 7,");
    expect(diff).toContain("ikut label bagian");
  });

  it("is a no-op when notation is already canonical and the intro is named", () => {
    expect(
      planNotationNormalization({
        title: "Sudah",
        introNotation: "6, 7, 1",
        sections: [
          { id: "sec", label: "Intro", type: "INTRO", content: "[C]6, 5" },
          { id: "verse", label: "Verse", type: "VERSE", content: "[G]Bapa" },
        ],
        overrides: [],
      }),
    ).toBeNull();
  });

  it("does not rename a lyric section that is still Bagian 1", () => {
    expect(
      planNotationNormalization({
        title: "Lirik",
        introNotation: null,
        sections: [
          { id: "sec", label: "Bagian 1", type: "OTHER", content: "[G]Bapa sentuh" },
        ],
        overrides: [],
      }),
    ).toBeNull();
  });

  it("suffixes Intro when that label is already used", () => {
    const plan = planNotationNormalization({
      title: "Dua",
      introNotation: null,
      sections: [
        { id: "named", label: "Intro", type: "INTRO", content: "[C]1 2" },
        { id: "generic", label: "Bagian 2", type: "INTRO", content: "[C].6" },
      ],
      overrides: [],
    });
    expect(plan?.sections.map((section) => section.labelAfter)).toEqual(["Intro (2)"]);
    expect(plan?.sections[0]?.contentAfter).toBe("[C]6,");
  });
});
