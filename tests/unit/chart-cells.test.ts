import { describe, expect, it } from "vitest";
import { buildLineModel, buildSectionModels, sectionIsInstrumental } from "@/lib/chart-cells";

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
    expect(sectionIsInstrumental([
      "{Intro}",
      "(pickup ½ bar)  F |",
      "| F . | G . | C G/B | Am . |",
      "| Dm Em | F . | G . | G . |",
    ])).toBe(true);
  });

  it("puts a notation chord and note in the same cell", () => {
    const model = buildLineModel("[C]1 [G/B]2 3");
    expect(model.kind).toBe("notation");
    if (model.kind !== "notation") return;
    expect(model.words[0]?.cells.some((cell) => cell.chord === "C" && cell.note?.raw === "1")).toBe(true);
  });

  it("groups a notation line with the following lyric line", () => {
    const models = buildSectionModels([
      "3 4 | [C]5 5 #4 5 1'",
      "Sungguh inginkah engkau",
    ]);
    expect(models[0]?.kind).toBe("couplet");
    if (models[0]?.kind !== "couplet") return;
    expect(models[0].words.flatMap((word) => word.cells).some((cell) => cell.chord === "C")).toBe(true);
    expect(models[0].words.flatMap((word) => word.cells).some((cell) => cell.text === "Sung")).toBe(true);
  });

  it("keeps hyphens and mid-word chords without inserted word gaps", () => {
    const model = buildLineModel("[G]Mela[C]yani");
    expect(model.kind).toBe("lyric");
    if (model.kind !== "lyric") return;
    const cells = model.words.flatMap((word) => word.cells);
    expect(cells.map((cell) => cell.text).join("")).toBe("Melayani");

    const hyphen = buildLineModel("ladang-Nya");
    expect(hyphen.kind).toBe("lyric");
    if (hyphen.kind !== "lyric") return;
    expect(hyphen.words[0]?.cells.some((cell) => cell.joinNext)).toBe(true);
  });

  it("keeps a trailing line-end chord inside the previous word", () => {
    const model = buildLineModel("dalam rumah Tuhan    [G7]");
    expect(model.kind).toBe("lyric");
    if (model.kind !== "lyric") return;
    expect(model.words).toHaveLength(3);
    expect(model.words.at(-1)?.cells.some((cell) => (
      cell.text === "" && cell.chord === "G7" && cell.trailing
    ))).toBe(true);
  });
});
