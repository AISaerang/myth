import { describe, expect, it } from "vitest";
import { buildLineModel, sectionIsInstrumental } from "@/lib/chart-cells";

describe("chart cell model", () => {
  it("builds lyric cells and starts a cell at each chord", () => {
    const model = buildLineModel("[G]Dulu [C]torang");
    expect(model.kind).toBe("lyric");
    if (model.kind !== "lyric") return;
    expect(model.words).toHaveLength(2);
    expect(model.words[0]?.cells[0]).toMatchObject({ chord: "G", text: "Dulu" });
    expect(model.words[1]?.cells[0]).toMatchObject({ chord: "C", text: "torang" });
  });

  it("keeps F and G in separate amin cells", () => {
    const model = buildLineModel("Haleluya, [F]a[G]min [C] [Am]");
    expect(model.kind).toBe("lyric");
    if (model.kind !== "lyric") return;
    const flat = model.words.flatMap((word) => word.cells);
    expect(flat.map((cell) => cell.chord).filter(Boolean)).toEqual(["F", "G", "C", "Am"]);
    expect(flat.at(-1)?.text).toBe("");
  });

  it("keeps hyphenated syllables in one word", () => {
    const model = buildLineModel("Iko dalam [F]te[G]rang-[C]Nya");
    expect(model.kind).toBe("lyric");
    if (model.kind !== "lyric") return;
    const wordsWithChord = model.words.flatMap((word) => word.cells);
    expect(wordsWithChord.find((cell) => cell.chord === "F")?.joinNext).toBe(true);
    expect(wordsWithChord.find((cell) => cell.chord === "G")?.joinNext).toBe(true);
  });

  it("builds notation and bar words", () => {
    const model = buildLineModel("[C]1 [G/B]2 3 | [Am].6 [5 6]");
    expect(model.kind).toBe("notation");
    if (model.kind !== "notation") return;
    expect(model.words.some((word) => word.isBar)).toBe(true);
    expect(model.words.some((word) => word.cells.some((cell) => cell.note?.raw === "5"))).toBe(true);
  });

  it("identifies invalid notation", () => {
    expect(buildLineModel("[C]x y")).toMatchObject({ kind: "lyric" });
  });

  it("builds two measure words", () => {
    const model = buildLineModel("| F . | G . |");
    expect(model.kind).toBe("bars");
    if (model.kind === "bars") {
      expect(model.words.filter((word) => word.isBar)).toHaveLength(3);
    }
  });

  it("returns an error model for invalid notation", () => {
    expect(buildLineModel("[C]1 8 2")).toMatchObject({ kind: "error" });
  });

  it("marks only notation-only sections as instrumental", () => {
    expect(sectionIsInstrumental(["{Intro}", "1 2 3", "| C . |"])).toBe(true);
    expect(sectionIsInstrumental(["{Verse}", "[G]Bapa [C]kami"])).toBe(false);
  });
});
