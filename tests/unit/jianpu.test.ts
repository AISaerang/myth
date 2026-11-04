import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NotAngka } from "@/components/NotAngka";
import {
  canonicalizeNotationText,
  parseJianpu,
  formatNote,
  formatLine,
  keyToFormula,
  toJianpuFontText,
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

  it("draws octave dots with CSS for comma and leading-dot forms", () => {
    const markup = renderToStaticMarkup(
      createElement(NotAngka, { value: "6, .7 ..1 1' 2''" }),
    );
    expect(markup).not.toContain("[object Object]");
    expect(markup).not.toContain("notation-glyph-font");
    expect(markup).toContain('data-notation="css"');
    expect(markup).toContain('data-octave="down"');
    expect(markup).toContain('data-octave="up"');
    expect(markup).toContain('data-octave-marks="2"');
    expect(markup).toContain("jianpu-dot");
    expect(markup).toContain("left-1/2");
    expect(markup).not.toContain(">.7<");
    expect(markup).not.toContain(">..1<");
  });

  it("draws a rising slash through # and a falling slash through b", () => {
    const markup = renderToStaticMarkup(createElement(NotAngka, { value: "#4 b7" }));
    expect(markup).toContain('data-accidental="sharp"');
    expect(markup).toContain('data-accidental="flat"');
    expect(markup).toContain("jianpu-accidental");
    expect(markup).not.toContain(">♯<");
    expect(markup).not.toContain(">#4<");
  });

  it("draws one beam, two beams, and a slur above groups", () => {
    const markup = renderToStaticMarkup(
      createElement(NotAngka, { value: "[5 6] [[1 2 3 4]] (5 6)" }),
    );
    expect(markup).toContain('data-beam="1"');
    expect(markup).toContain('data-beam="2"');
    expect(markup).toContain('data-slur="1"');
    expect(markup).toContain("notation-beam");
    expect(markup).toContain("notation-slur");
  });

  it("parses leading dots as lower octave, summed with comma suffixes", () => {
    const result = parseJianpu(".6 ..7 .#4 #.5 .6,");
    expect(result.valid).toBe(true);
    expect(result.lines[0]?.notes.map((note) => note.octave)).toEqual([-1, -2, -1, -1, -2]);
    expect(result.lines[0]?.notes.map((note) => note.accidental)).toEqual([0, 0, 1, 1, 0]);
    expect(result.lines[0]?.notes.map((note) => note.solfege)).toEqual([6, 7, 4, 5, 6]);
  });

  it("parses beams and slurs without dropping the notes", () => {
    const beamed = parseJianpu("[5 6] [[5 6 5 6]] (5 6) ([1 2])");
    expect(beamed.valid).toBe(true);
    const notes = beamed.lines[0]?.notes ?? [];
    expect(notes.map((note) => note.solfege)).toEqual([5, 6, 5, 6, 5, 6, 5, 6, 1, 2]);
    expect(notes[0]?.beam).toBe(1);
    expect(notes[0]?.beamGroup).toBe(notes[1]?.beamGroup);
    expect(notes[2]?.beam).toBe(2);
    expect(notes[2]?.beamGroup).not.toBe(notes[0]?.beamGroup);
    expect(notes[6]?.slurGroup).toBe(notes[7]?.slurGroup);
    expect(notes[6]?.beam).toBe(0);
    expect(notes[8]?.beam).toBe(1);
    expect(notes[8]?.slurGroup).toBe(notes[9]?.slurGroup);
  });

  it("rejects an unclosed beam", () => {
    const result = parseJianpu("[5 6");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("tidak tertutup");
  });

  it("canonicalizes leading-dot octaves and leaves lyrics and rhythm dots", () => {
    expect(canonicalizeNotationText(".6 ..7 .#4 #.5/ .6.")).toBe("6, 7,, #4, #5,/ 6,.");
    expect(canonicalizeNotationText("[C].6 .7 1\n# pelan")).toBe("[C]6, 7, 1\n# pelan");
    expect(canonicalizeNotationText("[[.6 .7]]")).toBe("[[6, 7,]]");
    expect(canonicalizeNotationText("Bapa lihat no. 6")).toBe("Bapa lihat no. 6");
    expect(canonicalizeNotationText("1. 2")).toBe("1. 2");
  });

  it("toJianpuFontText keeps octave marks so the font can ligate them", () => {
    expect(toJianpuFontText({ solfege: 1, octave: 1, accidental: 0, duration: 1, extension: 0, dotted: false })).toBe("1'");
    expect(toJianpuFontText({ solfege: 6, octave: -1, accidental: 0, duration: 1, extension: 0, dotted: false })).toBe("6,");
    expect(toJianpuFontText({ solfege: 1, octave: 1, accidental: 1, duration: 0.5, extension: 0, dotted: false })).toBe("^1'/");
    expect(toJianpuFontText({ solfege: 7, octave: -2, accidental: -1, duration: 1, extension: 0, dotted: false })).toBe("_7,,");
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
