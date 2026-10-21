import { describe, expect, it } from "vitest";
import { CHART_SECTION_TYPES } from "@/lib/chart-arrangement";
import { SETLIST_LYRICS } from "../../prisma/setlist-lyrics";

describe("SETLIST_LYRICS", () => {
  it("covers the three songs without a legacy chord chart", () => {
    expect(SETLIST_LYRICS.map((song) => song.title)).toEqual([
      "Ku Tak Pandang dari Gereja Mana",
      "NNBT No. 20 Kami Bersyukur padaMu Tuhan",
      "Obor Pembangunan",
    ]);
  });

  it("has unique, non-empty sections and valid arrangement references", () => {
    for (const song of SETLIST_LYRICS) {
      expect(song.arrangementName.trim()).not.toBe("");
      expect(song.sections.length).toBeGreaterThan(0);
      expect(song.items.length).toBeGreaterThan(0);

      const labels = song.sections.map((section) => section.label);
      expect(new Set(labels).size).toBe(labels.length);

      for (const section of song.sections) {
        expect(section.label.trim()).not.toBe("");
        expect(section.label.length).toBeLessThanOrEqual(50);
        expect(section.content.trim()).not.toBe("");
        expect(CHART_SECTION_TYPES).toContain(section.type);
      }

      for (const item of song.items) {
        expect(labels).toContain(item.label);
      }
    }
  });
});
