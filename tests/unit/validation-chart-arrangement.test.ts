import { describe, expect, it } from "vitest";
import {
  chartArrangementItemsSchema,
  chartSectionCreateSchema,
  chartSectionUpdateSchema,
  legacyChartImportSchema,
} from "@/lib/validation/chart-arrangement";

describe("chartSectionCreateSchema", () => {
  it("accepts a section without requiring chords", () => {
    expect(
      chartSectionCreateSchema.safeParse({
        songId: "song-1",
        type: "VERSE",
        label: "Verse 1",
        content: "Bapa sentuh hatiku",
      }).success,
    ).toBe(true);
  });

  it("rejects a heading inside content and duplicate-ish empty labels", () => {
    expect(
      chartSectionCreateSchema.safeParse({
        songId: "song-1",
        type: "VERSE",
        label: "",
        content: "[G]isi",
      }).success,
    ).toBe(false);
    expect(
      chartSectionCreateSchema.safeParse({
        songId: "song-1",
        type: "VERSE",
        label: "Verse 1",
        content: "{Verse 1}",
      }).success,
    ).toBe(false);
  });
});

describe("chartSectionUpdateSchema", () => {
  it("requires a section id", () => {
    expect(
      chartSectionUpdateSchema.safeParse({
        songId: "song-1",
        sectionId: "",
        type: "CHORUS",
        label: "Chorus",
        content: "[C]Hallelujah",
      }).success,
    ).toBe(false);
  });
});

describe("chartArrangementItemsSchema", () => {
  it("accepts repeats but requires at least one item", () => {
    expect(
      chartArrangementItemsSchema.safeParse({
        songId: "song-1",
        arrangementId: "arr-1",
        items: [
          { sectionId: "sec-1", labelOverride: null },
          { sectionId: "sec-1", labelOverride: "Chorus 2" },
        ],
      }).success,
    ).toBe(true);
    expect(
      chartArrangementItemsSchema.safeParse({
        songId: "song-1",
        arrangementId: "arr-1",
        items: [],
      }).success,
    ).toBe(false);
  });
});

describe("legacyChartImportSchema", () => {
  it("allows a default import name", () => {
    expect(
      legacyChartImportSchema.safeParse({ songId: "song-1" }).success,
    ).toBe(true);
  });
});
