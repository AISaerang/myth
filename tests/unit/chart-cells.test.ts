import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLineModel, buildSectionModels, sectionIsInstrumental } from "@/lib/chart-cells";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartLineView } from "@/components/ChartLineView";
import { layersForMode, type ChartViewMode } from "@/lib/chart-view-mode";
import { transposeContent } from "@/lib/chords";

function renderChartLine(
  model: ReturnType<typeof buildLineModel>,
  mode: ChartViewMode = "detail",
) {
  return renderToStaticMarkup(
    createElement(ChartLineView, {
      model,
      layers: layersForMode(mode),
    }),
  );
}

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

  it("adds a gap and stretch to adjacent inline chords in the generic lyric renderer", () => {
    const model = buildLineModel("Haleluya, [F]a[G]min");
    const html = renderChartLine(model, "lyrics-chords");

    expect(html).toMatch(/class="[^"]*chart-cell-gap[^"]*chart-cell-stretch[^"]*" data-chord="F"/);
  });

  it("adds a gap between adjacent chords inside a bar measure", () => {
    const model = buildLineModel("| Dm Em | F . |");
    const html = renderChartLine(model, "lyrics-chords");

    expect(html).toMatch(/class="[^"]*chart-cell-gap[^"]*" data-chord="Dm"/);
  });

  it("uses the same gap class in paired notation and lyric cells", () => {
    const model = {
      kind: "couplet" as const,
      paired: true,
      lyricText: "haleluya",
      words: [{
        isBar: false,
        cells: [
          { chord: "C", note: null, text: "ha", joinNext: false },
          { chord: "G", note: null, text: "leluya", joinNext: false },
        ],
      }],
    };
    const html = renderChartLine(model, "lyrics-chords");

    expect(html).toMatch(/class="[^"]*chart-cell-gap[^"]*" data-chord="C"/);
  });

  it("renders chord, notation, and lyric in explicit stacked lanes", () => {
    const [model] = buildSectionModels(["[C]1 [G]2", "Mela"]);
    if (!model || model.kind !== "couplet") throw new Error("Couplet missing");

    const markup = renderChartLine(model, "detail");
    const chordLane = markup.indexOf('data-chart-lane="chord"');
    const notationLane = markup.indexOf('data-chart-lane="notation"');
    const lyricLane = markup.indexOf('data-chart-lane="lyric"');

    expect(chordLane).toBeGreaterThan(-1);
    expect(notationLane).toBeGreaterThan(chordLane);
    expect(lyricLane).toBeGreaterThan(notationLane);
  });

  it("shows only the selected stacked lanes in each chart mode", () => {
    const [model] = buildSectionModels(["[C]1 [G]2", "Mela"]);
    if (!model || model.kind !== "couplet") throw new Error("Couplet missing");

    const notation = renderChartLine(model, "lyrics-notation");
    expect(notation).not.toContain('data-chart-lane="chord"');
    expect(notation).toContain('data-chart-lane="notation"');
    expect(notation).toContain('data-chart-lane="lyric"');

    const chords = renderChartLine(model, "lyrics-chords");
    expect(chords).toContain('data-chart-lane="chord"');
    expect(chords).not.toContain('data-chart-lane="notation"');
    expect(chords).toContain('data-chart-lane="lyric"');

    const lyrics = renderChartLine(model, "lyrics");
    expect(lyrics).not.toContain('data-chart-lane="chord"');
    expect(lyrics).not.toContain('data-chart-lane="notation"');
    expect(lyrics).toContain('data-chart-lane="lyric"');
  });

  it("keeps notation chords inside a chord lane in Lirik + Chord mode", () => {
    const html = renderChartLine(buildLineModel("[C]1 [G]2"), "lyrics-chords");

    expect(html).toContain('data-chart-chords-only=""');
    expect(html).toContain('data-chart-lane="chord"');
    expect(html).toContain('data-chord="C"');
    expect(html).toContain('data-chord="G"');
    expect(html).not.toContain('data-chart-lane="notation"');
  });

  it("adds gaps to adjacent Hidop chord cells after transposition", () => {
    const fixture = readFileSync(
      join(process.cwd(), "tests", "fixtures", "charts", "hidop-jadi-terang.txt"),
      "utf8",
    );
    const models = buildSectionModels(transposeContent(fixture, 2).split("\n"));
    let expectedGapCount = 0;
    let renderedGapCount = 0;

    for (const model of models) {
      if (!("words" in model)) continue;
      expectedGapCount += model.words.reduce(
        (count, word) =>
          count +
          word.cells.slice(0, -1).filter((cell, index) => (
            Boolean(cell.chord && word.cells[index + 1]?.chord)
          )).length,
        0,
      );
      renderedGapCount += (
        renderChartLine(model, "lyrics-chords").match(/chart-cell-gap/g) ?? []
      ).length;
    }

    expect(expectedGapCount).toBeGreaterThan(0);
    expect(renderedGapCount).toBe(expectedGapCount);
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

  it("renders a hyphen in a stretched chord cell", () => {
    const html = renderChartLine(buildLineModel("[G]Mela[C]yani"), "lyrics-chords");

    expect(html).toMatch(
      /class="[^"]*chart-cell-stretch[^"]*" data-chord="G"[^>]*>[\s\S]*?Mela<span class="chart-hyphen"/,
    );
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

  it("renders a trailing chord after the final lyric syllable with a gap", () => {
    const rumah = renderChartLine(
      buildLineModel("dalam rumah Tuhan    [G7]"),
      "lyrics-chords",
    );
    const hidop = renderChartLine(
      buildLineModel("bekeng bae [Em]pa [E7]samu[Am]a [A7]"),
      "lyrics-chords",
    );

    expect(rumah).toMatch(
      /class="[^"]*chart-cell-trailing[^"]*" data-chord="G7"[^>]* data-trailing="true"/,
    );
    expect(hidop).toMatch(/class="[^"]*chart-cell-gap[^"]*" data-chord="Am"/);
    expect(hidop).toMatch(/class="[^"]*chart-cell-trailing[^"]*" data-chord="A7"[^>]* data-trailing="true"/);
  });

  it("loads fixtures and preserves NKB 212 couplets and Hidop instrumental body", () => {
    const fixtureDir = join(process.cwd(), "tests", "fixtures", "charts");
    const bait = readFileSync(join(fixtureDir, "nkb-212-bait-1.txt"), "utf8");
    const reff = readFileSync(join(fixtureDir, "nkb-212-reff.txt"), "utf8");
    const intro = readFileSync(join(fixtureDir, "hidop-intro.txt"), "utf8");

    const baitModels = buildSectionModels(bait.split("\n"));
    expect(baitModels.some((model) => model.kind === "couplet")).toBe(true);
    expect(buildSectionModels(reff.split("\n")).some((model) => model.kind === "couplet")).toBe(true);
    expect(sectionIsInstrumental(intro.split("\n"))).toBe(true);
  });

  it("pairs NKB 212 syllables to the exact notation slots", () => {
    const models = buildSectionModels([
      "3 4 | [C]5 5 #4 5 1'",
      "Sungguh inginkah engkau",
    ]);
    const couplet = models[0];
    expect(couplet?.kind).toBe("couplet");
    if (couplet?.kind !== "couplet") return;
    expect(couplet.paired).toBe(true);
    expect(couplet.lyricText).toBe("Sungguh inginkah engkau");
    const lyricWords = couplet.words.filter((word) => !word.isBar);
    expect(lyricWords).toHaveLength(3);
    expect(lyricWords[0]?.cells.map((cell) => cell.text)).toEqual(["Sung", "guh"]);
    expect(lyricWords[1]?.cells.map((cell) => cell.text)).toEqual(["i", "ngin", "kah"]);
    expect(lyricWords[2]?.cells.map((cell) => cell.text)).toEqual(["eng", "kau"]);
  });

  it("renders NKB 212 coupled words with preserved lyric text in all modes", () => {
    const models = buildSectionModels([
      "3 4 | [C]5 5 #4 5 1'",
      "Sungguh inginkah engkau",
    ]);
    const couplet = models[0];
    if (couplet?.kind !== "couplet") throw new Error("NKB couplet missing");

    for (const mode of ["lyrics", "lyrics-notation", "lyrics-chords", "detail"] as const) {
      const html = renderToStaticMarkup(
        createElement(ChartLineView, {
          model: couplet,
          layers: layersForMode(mode),
        }),
      );
      expect(html).toContain('data-lyric-text="Sungguh inginkah engkau"');
      expect(html).toContain("Sung");
      expect(html).toContain("inginkah".replace("inginkah", "ngin"));
      expect(html).not.toContain("data-notation-error");
    }
  });

  it("pairs every lyric line in the stacked editor screenshot, including melisma", () => {
    const models = buildSectionModels([
      "[G]0 3 3 4 | [C]5 5-- 3' 3' 2' | 1' 5-",
      "Ya Allah Bapa, ya Yesu Tuhan,",
      "[G7]3 6- 5 | 5 4-",
      "ya Rohul Kudus,",
      "[A7]0 2 2 3 | [Dm]4 4-- 2' 2' 1' | [G]7 7-",
      "aku bersyukur, aku memuji",
    ]);
    const couplets = models.filter((model) => model.kind === "couplet");
    expect(couplets).toHaveLength(3);

    for (const couplet of couplets) {
      if (couplet.kind !== "couplet") continue;
      expect(couplet.paired).toBe(true);
    }

    const first = couplets[0];
    if (first?.kind !== "couplet") throw new Error("First couplet missing");
    const firstCells = first.words.flatMap((word) => word.cells);
    expect(firstCells.filter((cell) => cell.melisma)).toHaveLength(1);
    expect(firstCells.at(-1)?.melisma).toBe(true);
    expect(
      first.words
        .filter((word) => !word.isBar)
        .map((word) => word.cells.map((cell) => cell.text).join("")),
    ).toEqual(["Ya", "Allah", "Ba", "pa,", "ya", "Yesu", "Tu", "han,"]);

    const html = renderChartLine(first, "detail");
    expect(html).toContain('data-melisma="true"');
    expect(html).toContain("chart-melisma-line");
  });

  it("keeps bar words between measures in a paired couplet", () => {
    const [model] = buildSectionModels(["[G7]3 6- 5 | 5 4-", "ya Rohul Kudus,"]);
    if (model?.kind !== "couplet") throw new Error("Couplet missing");

    const barIndex = model.words.findIndex((word) => word.isBar);
    expect(barIndex).toBeGreaterThan(0);
    expect(barIndex).toBeLessThan(model.words.length - 1);
    expect(model.words.at(-1)?.isBar).toBe(false);
  });

  it("renders a duration extension only once", () => {
    const html = renderChartLine(buildLineModel("[C]5--"), "detail");
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("5--");
    expect(text).not.toContain("5----");
  });

  it("keeps bar lines visible in chord and notation modes", () => {
    const [model] = buildSectionModels(["[G7]3 6- 5 | 5 4-", "ya Rohul Kudus,"]);
    if (model?.kind !== "couplet") throw new Error("Couplet missing");

    for (const mode of ["lyrics-chords", "lyrics-notation", "detail"] as const) {
      expect(renderChartLine(model, mode)).toContain('data-chart-word="bar"');
    }
    expect(renderChartLine(model, "lyrics")).not.toContain('data-chart-word="bar"');
  });

  it("renders an unpaired couplet lyric as a block below the notation", () => {
    const [model] = buildSectionModels(["[C]1", "Ya Allah Bapa"]);
    if (model?.kind !== "couplet") throw new Error("Couplet missing");

    expect(model.paired).toBe(false);
    const html = renderChartLine(model, "detail");
    expect(html).toContain('data-chart-text-row=""');
    expect(html).toContain("Ya Allah Bapa");
  });
});
