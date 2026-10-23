import { describe, expect, it } from "vitest";
import {
  chordProToOverUnder,
  expandTabs,
  extractChordLines,
  isOverUnderFormat,
  layoutChordLine,
  listChords,
  normalizeToC,
  noteIndex,
  overUnderToChordPro,
  parseChord,
  semitonesBetween,
  stripChords,
  transposeChord,
  transposeContent,
  transposeRoot,
} from "@/lib/chords";
import type { ChordLyricLayout } from "@/lib/chords";

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

describe("over-under editor format", () => {
  const chart = [
    "{Verse 1}",
    "",
    "[G]Bapa sentuh ha[D/F#]tiku",
    "[Em]ubah hidupku jadi baru",
    "Reff manakah yang lain",
    "[Bm] [A]",
  ].join("\n");

  const render = (content: string): ChordLyricLayout[] =>
    content.split("\n").map((line) => layoutChordLine(line));

  it("renders chords above the lyric line", () => {
    const over = chordProToOverUnder(chart);
    expect(over).toContain("G             D/F#");
    expect(over).toContain("Bapa sentuh hatiku");
    expect(over).toContain("Em");
    expect(over).toContain("Bm A");
  });

  it("roundtrip ChordPro -> over-under -> ChordPro is lossless", () => {
    expect(overUnderToChordPro(chordProToOverUnder(chart))).toBe(chart);
    expect(overUnderToChordPro(chordProToOverUnder("[C]Bapa [Am]sentuh"))).toBe(
      "[C]Bapa [Am]sentuh",
    );
    // Label, baris kosong, dan baris lirik tanpa chord juga utuh.
    expect(overUnderToChordPro(chordProToOverUnder("{Reff}"))).toBe("{Reff}");
    expect(overUnderToChordPro(chordProToOverUnder(""))).toBe("");
    expect(overUnderToChordPro(chordProToOverUnder("Ubah hidupku"))).toBe(
      "Ubah hidupku",
    );
  });

  it("keeps the rendered layout identical after a roundtrip", () => {
    const back = overUnderToChordPro(chordProToOverUnder(chart));
    expect(render(back)).toEqual(render(chart));
  });

  it("keeps chords exactly on hyphen syllables", () => {
    // Chord pas di pemisah suku kata (perpangkah) harus tetap di sana.
    const pro = "[C]ha-ti-ku berkemah";
    expect(overUnderToChordPro(chordProToOverUnder(pro))).toBe(pro);
  });

  it("maps chords to their exact column, including above spaces", () => {
    // Chord di atas spasi (kolom 4) tetap di kolom itu, tidak di-snap.
    expect(overUnderToChordPro("Am  D\nBapa sentuh")).toBe(
      "[Am]Bapa[D] sentuh",
    );
    const layout = layoutChordLine("[Am]Bapa[D] sentuh");
    expect(layout.chordLine.trimEnd()).toBe("Am  D");
    expect(layout.lyricLine).toBe("Bapa sentuh");
    // Roundtrip tetap persis di kolom yang sama.
    expect(overUnderToChordPro(chordProToOverUnder("[Am]Bapa[D] sentuh"))).toBe(
      "[Am]Bapa[D] sentuh",
    );
  });

  it("renders chords placed after the lyric ends", () => {
    // Kunci setelah lirik habis tetap melayang di kolomnya (gap = spasi).
    expect(overUnderToChordPro("Am        D\nBapa")).toBe("[Am]Bapa      [D]");
    const layout = layoutChordLine("[Am]Bapa      [D]");
    expect(layout.lyricLine.trimEnd()).toBe("Bapa");
    expect(layout.chordLine.indexOf("D")).toBe(10);
    // Roundtrip dengan gap tetap lossless.
    expect(overUnderToChordPro(chordProToOverUnder("[Am]Bapa      [D]"))).toBe(
      "[Am]Bapa      [D]",
    );
  });

  it("expands real tab characters like the browser renders them", () => {
    expect(expandTabs("C\tG")).toBe("C       G");
    expect(expandTabs("\tF")).toBe("        F");
    expect(expandTabs("ab\tc")).toBe("ab      c");
  });

  it("keeps tab-pasted over-under aligned with its display", () => {
    // Keyboard HP menyisipkan \t: tab-stop 8, jadi G/B terlihat di kolom 16.
    const editor = expandTabs("C\t\tG/B\nKemanakah aku dapat pergi");
    expect(editor.indexOf("G/B")).toBe(16);
    const pro = overUnderToChordPro(editor);
    const layout = layoutChordLine(pro.split("\n")[0] as string);
    expect(layout.chordLine.indexOf("G/B")).toBe(16);
  });

  it("expands tabs inside hyphen and slash-bass pastes", () => {
    // Tab dari kolom 2 → tab-stop 8 = 6 spasi.
    expect(overUnderToChordPro(expandTabs("Am\tD/F#\nBapa sentuh"))).toBe(
      overUnderToChordPro("Am      D/F#\nBapa sentuh"),
    );
  });

  it("parses pasted over-under text into ChordPro", () => {
    // Chord dipetakan ke suku kata di kolomnya: D/F# tepat di atas "u" (kolom 9).
    expect(overUnderToChordPro("G        D/F#\nBapa sentuh hatiku")).toBe(
      "[G]Bapa sent[D/F#]uh hatiku",
    );
    expect(overUnderToChordPro("Am\nBapa sentuh")).toBe("[Am]Bapa sentuh");
  });

  it("parses chord-only and stacked chords from pasted text", () => {
    expect(overUnderToChordPro("Bm   A")).toBe("[Bm]   [A]");
    expect(overUnderToChordPro("Am  Dm\n")).toBe("[Am]  [Dm]\n");
  });

  it("detects over-under paste vs ChordPro paste", () => {
    expect(isOverUnderFormat("G        D/F#\nBapa sentuh hatiku")).toBe(true);
    expect(isOverUnderFormat("[G]Bapa sentuh ha[D/F#]tiku")).toBe(false);
    expect(isOverUnderFormat("Bapa sentuh hatiku tanpa chord")).toBe(false);
  });

  it("leaves non-chord bracket tokens untouched", () => {
    const pro = "[?] halo [G]tuhan";
    expect(overUnderToChordPro(chordProToOverUnder(pro))).toBe(pro);
  });
});
