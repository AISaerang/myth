import { describe, expect, it } from "vitest";
import {
  extractChordLines,
  layoutChordLine,
  listChords,
  normalizeToC,
  noteIndex,
  parseChord,
  semitonesBetween,
  stripChords,
  transposeChord,
  transposeContent,
  transposeRoot,
} from "@/lib/chords";

describe("transposeChord", () => {
  it("transposes basic majors and minors", () => {
    expect(transposeChord("G", 5)).toBe("C");
    expect(transposeChord("C", -2)).toBe("A#");
    expect(transposeChord("Am", 3)).toBe("Cm");
    expect(transposeChord("F#m", 1)).toBe("Gm");
  });

  it("wraps B->C and E->F correctly", () => {
    expect(transposeChord("B", 1)).toBe("C");
    expect(transposeChord("E", 1)).toBe("F");
    expect(transposeChord("C", -1)).toBe("B");
  });

  it("transposes slash bass too", () => {
    expect(transposeChord("D/F#", 5)).toBe("G/B");
    expect(transposeChord("G/B", -2)).toBe("F/A");
  });

  it("keeps suffixes and prefers flats on request", () => {
    expect(transposeChord("Dm7", 1)).toBe("D#m7");
    expect(transposeChord("Dm7", 1, true)).toBe("Ebm7");
    expect(transposeChord("Bb", 2)).toBe("C");
  });

  it("rejects garbage", () => {
    expect(() => parseChord("H7")).toThrow();
    expect(() => noteIndex("Z")).toThrow();
  });
});

describe("transposeContent + normalizeToC", () => {
  const sample = "Bapa [G]sentuh ha[D/F#]tiku\n[Em]Ubah hidupku [Bm]menjadi baru";

  it("shifts inline chords, leaves lyrics intact", () => {
    const out = transposeContent(sample, 5);
    expect(out).toContain("[C]");
    expect(out).toContain("[G/B]");
    expect(out).toContain("sentuh");
    expect(out).not.toContain("[G]");
  });

  it("is a no-op for multiples of 12", () => {
    expect(transposeContent(sample, 12)).toBe(sample);
  });

  it("normalizes G to C", () => {
    const out = normalizeToC(sample, "G");
    expect(out).toContain("[C]");
    expect(out).toContain("[G/B]");
    expect(out).toContain("[Am]");
  });

  it("keeps invalid bracket tokens untouched", () => {
    expect(transposeContent("[?] halo [G]", 5)).toBe("[?] halo [C]");
  });

  it("measures semitone distance", () => {
    expect(semitonesBetween("G", "C")).toBe(5);
    expect(semitonesBetween("C", "C")).toBe(0);
    expect(semitonesBetween("D", "C")).toBe(10);
  });

  it("transposes a root label for the viewer", () => {
    expect(transposeRoot("C", 0)).toBe("C");
    expect(transposeRoot("C", 2)).toBe("D");
    expect(transposeRoot("C", -2)).toBe("A#");
    expect(transposeRoot("C", -2, true)).toBe("Bb");
  });
});

describe("view modes", () => {
  const sample = "{Reff}\nBapa [G]sentuh ha[D]tiku\nUbah hidupku";

  it("strips chords for lyrics mode", () => {
    const out = stripChords(sample);
    expect(out).not.toContain("[");
    expect(out).toContain("Bapa sentuh hatiku");
    expect(out).toContain("Reff");
  });

  it("extracts chord lines for chord mode", () => {
    const lines = extractChordLines(sample);
    expect(lines[0]).toContain("Reff");
    expect(lines[1]).toBe("G  D");
    expect(lines[2]).toBe("");
  });

  it("lists unique valid chords", () => {
    expect(listChords(sample)).toEqual(["G", "D"]);
  });
});

describe("layoutChordLine", () => {
  it("aligns chords above the lyric characters", () => {
    const out = layoutChordLine("Bapa [G]sentuh ha[D]tiku");
    expect(out.lyricLine).toBe("Bapa sentuh hatiku");
    expect(out.chordLine[5]).toBe("G");
    expect(out.chordLine[14]).toBe("D");
    expect(out.chordLine.replace(/\s/g, "")).toBe("GD");
  });

  it("keeps chord-only lines readable without overlap", () => {
    const out = layoutChordLine("[Bb] [C] [Am] [Dm]");
    expect(out.chordLine).toBe("Bb C Am Dm");
    expect(out.lyricLine.trim()).toBe("");
    expect(out.isEmpty).toBe(false);
  });

  it("separates chords that would otherwise overlap", () => {
    const out = layoutChordLine("[G/B][D]lirik");
    expect(out.chordLine.trim()).toBe("G/B D");
    expect(out.lyricLine).toBe("lirik");
  });

  it("returns section labels and blank lines separately", () => {
    expect(layoutChordLine("{Reff}").label).toBe("Reff");
    expect(layoutChordLine("   ").isEmpty).toBe(true);
  });

  it("leaves lyric-only lines without a chord row", () => {
    const out = layoutChordLine("Ubah hidupku");
    expect(out.chordLine.trim()).toBe("");
    expect(out.lyricLine).toBe("Ubah hidupku");
  });
});
