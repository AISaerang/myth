import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NotAngka } from "@/components/NotAngka";
import {
  formatNote,
  formatLine,
  keyToFormula,
  looksLikeNotationLine,
  normalizeNotationInput,
  parseJianpu,
} from "@/lib/jianpu";

describe("JianpuASCII parser", () => {
  it("parses empty input", () => {
    const result = parseJianpu("");
    expect(result.valid).toBe(true);
    expect(result.lines).toEqual([]);
  });

  it("parses single notes 1-7", () => {
    const result = parseJianpu("1 2 3 4 5 6 7");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes.map((n) => n.solfege)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("parses zero (diam)", () => {
    const result = parseJianpu("1 0 2");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes.map((n) => n.solfege)).toEqual([1, 0, 2]);
  });

  it("parses oktaf atas dengan apostrof", () => {
    const result = parseJianpu("1' 2' 3'");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes.map((n) => n.octave)).toEqual([1, 1, 1]);
    expect(result.lines[0].notes.map((n) => n.solfege)).toEqual([1, 2, 3]);
  });

  it("parses oktaf atas ganda dengan dua apostrof", () => {
    const result = parseJianpu("1''");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes[0].octave).toBe(2);
  });

  it("parses oktaf bawah dengan koma", () => {
    const result = parseJianpu("6, 5,");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes.map((n) => n.octave)).toEqual([-1, -1]);
  });

  it("parses oktaf bawah ganda dengan dua koma", () => {
    const result = parseJianpu("1,,");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes[0].octave).toBe(-2);
  });

  it("parses kres/mol di depan nada", () => {
    const result = parseJianpu("#1 b7");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes[0].accidental).toBe(1);
    expect(result.lines[0].notes[1].accidental).toBe(-1);
  });

  it("parses ketukan setengah dan seperempat", () => {
    const result = parseJianpu("1/ 2// 3");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes[0].duration).toBe(0.5);
    expect(result.lines[0].notes[1].duration).toBe(0.25);
    expect(result.lines[0].notes[2].duration).toBe(1);
  });

  it("parses tanda panjang", () => {
    const result = parseJianpu("1---");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes[0].extension).toBe(3);
  });

  it("parses titik ritme", () => {
    const result = parseJianpu("1. 2");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes[0].dotted).toBe(true);
    expect(result.lines[0].notes[1].dotted).toBe(false);
  });

  it("parses birama pemisah", () => {
    const result = parseJianpu("1 2 3 | 4 5 6");
    expect(result.valid).toBe(true);
    expect(result.lines.length).toBe(2);
    expect(result.lines[0].notes.map((n) => n.solfege)).toEqual([1, 2, 3]);
    expect(result.lines[1].notes.map((n) => n.solfege)).toEqual([4, 5, 6]);
  });

  it("rejects invalid solfege (8, 9)", () => {
    const result = parseJianpu("1 8 2");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Nada tidak valid");
  });

  it("rejects unrecognized characters", () => {
    const result = parseJianpu("1x");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Karakter tidak dikenali");
  });

  it("rejects accidental without note", () => {
    const result = parseJianpu("#");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("hanya accidental");
  });

  it("example dari konteks: 6, 5, 1 2 3", () => {
    const result = parseJianpu("6, 5, 1 2 3");
    expect(result.valid).toBe(true);
    const notes = result.lines[0].notes;
    expect(notes[0].solfege).toBe(6);
    expect(notes[0].octave).toBe(-1);
    expect(notes[1].solfege).toBe(5);
    expect(notes[1].octave).toBe(-1);
    expect(notes[2].solfege).toBe(1);
    expect(notes[2].octave).toBe(0);
    expect(notes[3].solfege).toBe(2);
    expect(notes[4].solfege).toBe(3);
  });

  it("normalizes unicode whitespace and dots before parsing", () => {
    const nbsp = "\u00a0";
    const fullwidthDot = "\uff0e";
    const middleDot = "\u00b7";
    // parseJianpu tetap token-level; kurung slur dibersihkan di jianpu-align.
    const result = parseJianpu(`3 1${nbsp}2${nbsp}${fullwidthDot}5 ${middleDot}6`);
    expect(result.valid).toBe(true);
    const notes = result.lines[0].notes;
    expect(notes.map((n) => n.solfege)).toEqual([3, 1, 2, 5, 6]);
    expect(notes[3].octave).toBe(-1);
    expect(notes[4].octave).toBe(-1);
  });

  it("parses leading dot tokens as octave down (setara koma)", () => {
    const result = parseJianpu(".5 .6 5,");
    expect(result.valid).toBe(true);
    expect(result.lines[0].notes.map((n) => n.octave)).toEqual([-1, -1, -1]);
  });

  it("parses double leading dots as two octaves down", () => {
    const result = parseJianpu("..5");
    expect(result.lines[0].notes[0].octave).toBe(-2);
  });

  it("keeps trailing-dotted rhythm notes intact", () => {
    const result = parseJianpu("1. 2");
    expect(result.lines[0].notes[0].dotted).toBe(true);
    expect(result.lines[0].notes[0].octave).toBe(0);
  });

  it("rejects a lone dot token", () => {
    const result = parseJianpu("1 . 2");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("hanya titik tanpa nada");
  });

  it("looksLikeNotationLine only accepts notation-looking lines", () => {
    expect(looksLikeNotationLine("3 (2 3 2) 1 2 (1 2 1)  .5 .6")).toBe(true);
    expect(looksLikeNotationLine("(3 1 .5) (2 .7 .5)")).toBe(true);
    expect(looksLikeNotationLine("1\u00a02\u00a0(1\u00a02\u00a01)\u00a0\u00a0.5\u00a0.6")).toBe(true);
    expect(looksLikeNotationLine("#1 b7 1// 1-- 1.")).toBe(true);
    expect(looksLikeNotationLine("[[5 6]]")).toBe(true);
    expect(looksLikeNotationLine("Bapa sentuh")).toBe(false);
    expect(looksLikeNotationLine("1 2 hai")).toBe(false);
    expect(looksLikeNotationLine("Am  D")).toBe(false);
  });

  it("normalizeNotationInput fixes only notation-looking lines", () => {
    const nbsp = "\u00a0";
    const thin = "\u2009";
    const input = [
      "C   G",
      `3 (2 3 2) 1${nbsp}2 (1 2 1)${nbsp}${nbsp}.5${nbsp}.6`,
      `[Am]Bapa${nbsp}sentuh${thin}hatiku`,
      "   ",
    ].join("\n");
    const output = normalizeNotationInput(input);
    expect(output.split("\n")[0]).toBe("C   G");
    expect(output.split("\n")[1]).toBe("3 (2 3 2) 1 2 (1 2 1)  .5 .6");
    // Lirik biasa tidak disentuh.
    expect(output.split("\n")[2]).toBe(`[Am]Bapa${nbsp}sentuh${thin}hatiku`);
  });

  it("normalizeNotationInput converts smart apostrophes and fullwidth marks", () => {
    const output = normalizeNotationInput("1\u2019 5\uff0c 5\u00b7");
    expect(output).toBe("1' 5, 5.");
  });

  it("renders octave marks as CSS dots without the font path", () => {
    const markup = renderToStaticMarkup(
      createElement(NotAngka, { value: "6, 5, 1' 2 3" }),
    );
    expect(markup).not.toContain("[object Object]");
    expect(markup).not.toContain("-top-2");
    expect(markup).not.toContain("notation-glyph-font");
    expect(markup).not.toContain("jianpu-ascii");
    expect(markup).toContain('data-note="1&#x27;"');
    expect(markup).toContain('data-note="6,"');
    expect(markup).toContain('data-octave="up"');
    expect(markup).toContain('data-octave="down"');
    expect(markup).toContain("jianpu-dot");
    expect(markup).toContain(">1<");
    expect(markup).toContain(">6<");
  });

  it("renders leading-dot octave notes with CSS dots", () => {
    const markup = renderToStaticMarkup(
      createElement(NotAngka, { value: ".5 .6" }),
    );
    expect(markup).toContain('data-note=".5"');
    expect(markup).toContain('data-octave="down"');
    expect(markup).toContain("jianpu-dot");
  });

  it("formatNote renders back correctly", () => {
    expect(formatNote({ solfege: 6, octave: -1, accidental: 0, duration: 1, extension: 0, dotted: false })).toBe("6,");
    expect(formatNote({ solfege: 1, octave: 1, accidental: 1, duration: 0.5, extension: 2, dotted: true })).toBe("#1'/--.");
  });

  it("formatLine joins notes with spaces", () => {
    const line = { raw: "1 2 3", notes: [{ solfege: 1, octave: 0, accidental: 0, duration: 1, extension: 0, dotted: false }, { solfege: 2, octave: 0, accidental: 0, duration: 1, extension: 0, dotted: false }, { solfege: 3, octave: 0, accidental: 0, duration: 1, extension: 0, dotted: false }] };
    expect(formatLine(line)).toBe("1 2 3");
  });

  it("keyToFormula returns C for C", () => {
    expect(keyToFormula("C")).toBe("C = C");
  });

  it("keyToFormula returns C + 2 for D", () => {
    expect(keyToFormula("D")).toBe("C + 2 = D");
  });

  it("keyToFormula returns C - 5 for G (jarak terpendek)", () => {
    // G = 7 semitones from C. 12 - 7 = 5, so C - 5 = G
    expect(keyToFormula("G")).toBe("C - 5 = G");
  });

  it("keyToFormula returns empty for null/undefined", () => {
    expect(keyToFormula(null)).toBe("");
    expect(keyToFormula(undefined)).toBe("");
  });
});
