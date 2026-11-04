import { describe, expect, it } from "vitest";
import { parseJianpu, formatNote, formatLine, keyToFormula } from "@/lib/jianpu";

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
