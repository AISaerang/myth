import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordViewer } from "@/app/(app)/songs/[id]/ChordViewer";
import { layoutChordLine, overUnderToChordPro, transposeContent } from "@/lib/chords";
import {
  alignChordsToNotation,
  contentHasNotation,
  formatTransposeFormula,
} from "@/lib/jianpu-align";

const INTRO_EDITOR = "C   G\n1' 2 3 4 5";

function alignEditor(editor: string) {
  const pro = overUnderToChordPro(editor);
  const [chordProLine = ""] = pro.split("\n");
  const layout = layoutChordLine(chordProLine);
  const aligned = alignChordsToNotation(layout.chordLine, layout.lyricLine);
  return { pro, layout, aligned };
}

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
    expect(markup).toContain("notation-glyph-font");
    expect(markup).toContain(">1&#x27;<");
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
});
