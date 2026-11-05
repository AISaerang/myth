import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartBody, ChordViewer } from "@/app/(app)/songs/[id]/ChordViewer";
import { layoutChordLine, overUnderToChordPro, transposeContent } from "@/lib/chords";
import {
  alignChordsToNotation,
  contentHasNotation,
  formatTransposeFormula,
  notationLineError,
} from "@/lib/jianpu-align";

const INTRO_EDITOR = "C   G\n1' 2 3 4 5";
const NBSP = "\u00a0";

function alignEditor(editor: string) {
  const pro = overUnderToChordPro(editor);
  const [chordProLine = ""] = pro.split("\n");
  const layout = layoutChordLine(chordProLine);
  const aligned = alignChordsToNotation(layout.chordLine, layout.lyricLine);
  return { pro, layout, aligned };
}

describe("notation normalization and diagnostics", () => {
  it("aligns pasted unicode notation and retains parser errors", () => {
    const aligned = alignChordsToNotation("", `3 (2 3 2) 1${NBSP}2${NBSP}.5`);
    expect(aligned?.tokens.filter((token) => token.kind === "note").map((token) => token.note?.solfege))
      .toEqual([3, 2, 3, 2, 1, 2, 5]);
    expect(aligned?.tokens.find((token) => token.raw === ".5")?.note?.octave).toBe(-1);
    expect(notationLineError("(1 2")).toContain("belum ditutup");
    expect(notationLineError("1 8 2")).toContain("Nada tidak valid");
    expect(notationLineError("1 2 hai")).toBeNull();
    expect(notationLineError("Bapa sentuh")).toBeNull();
    expect(notationLineError("(1 2)")).toBeNull();

    const markup = renderToStaticMarkup(
      createElement(ChordViewer, { content: "{Intro}\n1 8 2", baseKey: "C" }),
    );
    expect(markup).toContain('data-notation-error=""');
    expect(markup).toContain("Nada tidak valid");
  });

  it("renders a CSS slur below the notation notes", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const slurCss = css.slice(css.indexOf(".notation-slur {"), css.indexOf(".jianpu-dot"));
    expect(slurCss).toContain("bottom: 0.55rem");
    expect(slurCss).toContain("border-bottom");
    expect(slurCss).not.toContain("border-top");
  });
});

describe("not angka column alignment", () => {
  it("keeps C over 1' and G over the same gap as the editor after the octave mark collapses", () => {
    const { pro, aligned } = alignEditor(INTRO_EDITOR);
    expect(pro).toBe("[C]1' 2[G] 3 4 5");
    expect(aligned).not.toBeNull();
    if (!aligned) return;

    const notes = aligned.tokens.filter((token) => token.kind === "note");
    expect(notes.map((token) => token.raw)).toEqual(["1'", "2", "3", "4", "5"]);
    expect(notes.map((token) => token.renderCol)).toEqual([0, 2, 4, 6, 8]);
    expect(notes.map((token) => token.renderWidth)).toEqual([1, 1, 1, 1, 1]);
    expect(notes[0]?.note?.octave).toBe(1);
    expect(aligned.chords.map((chord) => [chord.token, chord.renderCol])).toEqual([
      ["C", 0],
      ["G", 3],
    ]);
    // C sits on the 1'. G stays one column after 2 — the space the editor showed.
    expect(aligned.chords[0]?.renderCol).toBe(notes[0]?.renderCol);
    expect(aligned.chords[1]?.renderCol).toBe((notes[1]?.renderCol ?? 0) + 1);
  });

  it("puts a chord typed on a digit directly on that note", () => {
    const { aligned } = alignEditor("C  G\n1' 2 3 4 5");
    expect(aligned).not.toBeNull();
    if (!aligned) return;
    const second = aligned.tokens.find((token) => token.raw === "2");
    const g = aligned.chords.find((chord) => chord.token === "G");
    expect(g?.renderCol).toBe(second?.renderCol);
  });

  it("collapses octave marks, slashes, and keeps sustain dashes as their own columns", () => {
    const up = alignChordsToNotation("", "1' 6, 1'' 1// 1--");
    expect(up?.tokens.map((token) => [token.raw, token.renderWidth, token.renderCol])).toEqual([
      ["1'", 1, 0],
      ["6,", 1, 2],
      ["1''", 1, 4],
      ["1//", 1, 6],
      ["1--", 3, 8],
    ]);
  });

  it("collapses a leading octave dot onto the digit and keeps the chord on that digit", () => {
    const aligned = alignChordsToNotation(" G", ".7 1");
    expect(aligned).not.toBeNull();
    const low = aligned?.tokens.find((token) => token.raw === ".7");
    expect(low?.renderWidth).toBe(1);
    expect(low?.note?.octave).toBe(-1);
    expect(low?.renderCol).toBe(0);
    expect(aligned?.chords[0]?.renderCol).toBe(low?.renderCol);
  });

  it("keeps a chord on the beamed digit after brackets collapse", () => {
    const lyric = "1 [5 6]";
    const aligned = alignChordsToNotation("   G", lyric);
    const five = aligned?.tokens.find((token) => token.raw === "5");
    expect(five?.beam).toBe(1);
    expect(five?.renderCol).toBe(aligned?.chords[0]?.renderCol);
    expect(aligned?.tokens.find((token) => token.raw === "6")?.beamGroup).toBe(five?.beamGroup);
  });

  it("shows Intro instead of BAGIAN for a notation section labeled Bagian 1", () => {
    const markup = renderToStaticMarkup(
      createElement(ChordViewer, {
        content: "{Bagian 1}\n[C]1 1 5 .7 .7 1\n[Am].6 .6 5  5/ 6/\n\n{Verse}\n[G]Bapa",
        baseKey: "C",
      }),
    );
    expect(markup).toContain('data-section-label="Intro"');
    expect(markup).toContain("normal-case");
    expect(markup).not.toContain("Bagian 1");
    expect(markup).toContain('data-octave="down"');
    expect(markup).toContain('data-underline="1"');
    expect(markup).toContain("Bapa");
    expect(markup).toContain('data-chord="C"');
  });

  it("keeps a barline as its own column between notes", () => {
    const aligned = alignChordsToNotation("", "1 | 2");
    expect(aligned?.tokens.map((token) => [token.kind, token.renderCol])).toEqual([
      ["note", 0],
      ["bar", 2],
      ["note", 4],
    ]);
  });

  it("does not treat lyric lines as notation", () => {
    expect(alignChordsToNotation("G        D", "Bapa sentuh")).toBeNull();
    expect(alignChordsToNotation("", "1 2 hai")).toBeNull();
    expect(alignChordsToNotation("C G", "")).toBeNull();
    expect(alignChordsToNotation("", "   |   ")).toBeNull();
  });

  it("transposes chords and leaves solfege and columns unchanged", () => {
    const { pro, aligned } = alignEditor(INTRO_EDITOR);
    const shifted = transposeContent(pro, 2);
    expect(shifted).toBe("[D]1' 2[A] 3 4 5");
    const layout = layoutChordLine(shifted.split("\n")[0] ?? "");
    const next = alignChordsToNotation(layout.chordLine, layout.lyricLine);
    expect(next?.chords.map((chord) => chord.token)).toEqual(["D", "A"]);
    expect(next?.chords.map((chord) => chord.renderCol)).toEqual(
      aligned?.chords.map((chord) => chord.renderCol),
    );
    expect(next?.tokens.filter((token) => token.note).map((token) => token.note?.solfege)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(next?.tokens[0]?.note?.octave).toBe(1);
  });

  it("formats the transpose formula from the storage key", () => {
    expect(formatTransposeFormula("C", "D")).toBe("C + 2 = D");
    expect(formatTransposeFormula("C", "C")).toBe("C = C");
    expect(formatTransposeFormula("C", "G")).toBe("C - 5 = G");
    expect(formatTransposeFormula("C", "Bb")).toBe("C - 2 = Bb");
    expect(formatTransposeFormula("G", "A")).toBe("G + 2 = A");
    expect(formatTransposeFormula("", "D")).toBe("");
  });

  it("detects notation inside chordpro content", () => {
    expect(contentHasNotation("[C]1' 2[G] 3 4 5")).toBe(true);
    expect(contentHasNotation("{Intro}\n[C]1' 2 3")).toBe(true);
    expect(contentHasNotation("[G]Bapa [D]sentuh")).toBe(false);
  });

  it("renders the chart preview with chords on their columns and the key formula", () => {
    const markup = renderToStaticMarkup(
      createElement(ChordViewer, {
        content: "{Intro}\n[C]1' 2[G] 3 4 5\n[G]Bapa [D]sentuh",
        baseKey: "C",
      }),
    );
    expect(markup).toContain('data-key-formula="">C = C');
    expect(markup).toContain('data-chord="C"');
    expect(markup).toContain('data-render-col="0"');
    expect(markup).toContain('data-chord="G"');
    expect(markup).toContain('data-render-col="3"');
    expect(markup).toContain('data-note="1&#x27;"');
    expect(markup).toContain('data-notation="css"');
    expect(markup).toContain('data-octave="up"');
    expect(markup).not.toContain("notation-glyph-font");
    expect(markup).toContain("Bapa");
    expect(markup).toContain("Intro");
    expect(markup).not.toContain("-top-2");
    expect(markup.match(/data-key-formula=/g)).toHaveLength(1);
    const controls = markup.slice(0, markup.indexOf('data-chart-body=""'));
    expect(controls).toContain("data-key-formula=");
    expect(markup.slice(markup.indexOf('data-chart-body=""'))).not.toContain(
      "data-key-formula=",
    );
  });

  it("shows the transpose formula once for an arrangement that starts with Intro", () => {
    const markup = renderToStaticMarkup(
      createElement(ChordViewer, {
        content:
          "{Intro}\n[C]1' 2[G] 3 4 5\n# mainkan pelan\n\n{Verse}\n[C]1 2 3 4\n[G]Bapa [D]sentuh",
        baseKey: "C",
        initialOffset: 2,
      }),
    );
    expect(markup.match(/data-key-formula=/g)).toHaveLength(1);
    expect(markup).toContain("C + 2 = D");
    expect(markup).toContain('data-chord="D"');
    expect(markup).toContain('data-render-col="0"');
    expect(markup).toContain('data-chord="A"');
    expect(markup).toContain('data-render-col="3"');
    expect(markup).toContain('data-note="1&#x27;"');
    expect(markup).toContain('data-chart-comment=""');
    expect(markup).toContain("mainkan pelan");
    expect(markup).toContain("Bapa");
    expect(markup).toContain("Intro");
    expect(markup).toContain("Verse");
  });

  it("renders every intro line at the lyric size, including a last line with Csus4 and bar lines", () => {
    const content = [
      "{Intro}",
      "[C]6 5 1 2 3 | |",
      "[F]6 5 1 2 [C]3 | |",
      "[F]6 5 1 2 3 | |[C]     [Csus4]",
      "{Verse}",
      "[G]Bapa [D]sentuh",
    ].join("\n");

    const both = renderToStaticMarkup(
      createElement(ChartBody, { content, mode: "both", renderKey: "intro-size" }),
    );
    const staffs = [...both.matchAll(/class="([^"]*notation-staff[^"]*)"/g)].map(
      (match) => match[1] ?? "",
    );
    expect(staffs).toHaveLength(3);
    for (const className of staffs) {
      expect(className).toContain("text-sm");
      expect(className).toContain("leading-6");
      expect(className).toContain("font-mono");
    }
    expect(both).toContain('data-chord="Csus4"');
    expect(both).toContain('data-kind="bar"');
    expect(both.match(/data-kind="bar"/g)).toHaveLength(6);
    expect(both).toContain("Bapa");
    expect(both).toContain("font-mono text-sm leading-6");
    const lyric = both.slice(both.lastIndexOf("Bapa") - 180, both.lastIndexOf("Bapa"));
    expect(lyric).toContain("text-sm");
    expect(lyric).not.toContain("notation-staff");

    const css = readFileSync("src/app/globals.css", "utf8");
    const staffCss = css.slice(css.indexOf(".notation-staff {"), css.indexOf(".jianpu-dot"));
    expect(staffCss).toContain("font-size: 0.875rem");
    expect(staffCss).toContain("line-height: 1.5rem");
    expect(staffCss).toContain("height: 1.5rem");
    expect(staffCss).not.toContain("1.75rem");
    expect(staffCss).not.toContain("2.4em");
    expect(staffCss).not.toContain("JianpuASCII");

    const lyricsOnly = renderToStaticMarkup(
      createElement(ChartBody, { content, mode: "lyrics", renderKey: "intro-lyrics" }),
    );
    expect(lyricsOnly.match(/notation-staff/g)).toHaveLength(3);
    expect(lyricsOnly).not.toContain('data-chord="Csus4"');
    expect(lyricsOnly).toContain('data-note="6"');
    expect(lyricsOnly).toContain('data-kind="bar"');
    expect(lyricsOnly).toContain("Bapa");

    const chordsOnly = renderToStaticMarkup(
      createElement(ChartBody, { content, mode: "chords", renderKey: "intro-chords" }),
    );
    expect(chordsOnly).not.toContain("notation-staff");
    expect(chordsOnly).toContain("Csus4");
    expect(chordsOnly).toContain("text-sm");
    expect(chordsOnly).toContain("Intro");

    const shifted = renderToStaticMarkup(
      createElement(ChordViewer, { content, baseKey: "C", initialOffset: 2 }),
    );
    expect(shifted).toContain('data-chord="Dsus4"');
    expect(shifted).toContain('data-chord="G"');
    expect(shifted).not.toContain('data-chord="Csus4"');
    expect(shifted).toContain('data-note="6"');
    expect(shifted).toContain('data-note="3"');
    expect(shifted.match(/notation-staff/g)).toHaveLength(3);
  });
});
