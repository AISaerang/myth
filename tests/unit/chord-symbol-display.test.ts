import { describe, expect, it } from "vitest";
import { formatChordSymbol } from "@/lib/chord-symbol-display";

describe("chord symbol display", () => {
  it("formats common lead-sheet chord symbols", () => {
    expect(formatChordSymbol("Am7")).toMatchObject({ root: "A", quality: "m", extension: "7" });
    expect(formatChordSymbol("Cmaj7")).toMatchObject({ root: "C", quality: "", extension: "maj7" });
    expect(formatChordSymbol("Bm7b5")).toMatchObject({ root: "B", quality: "m", extension: "7♭5" });
    expect(formatChordSymbol("Bdim7")).toMatchObject({ root: "B", quality: "dim", extension: "7" });
    expect(formatChordSymbol("Csus4")).toMatchObject({ root: "C", quality: "sus", extension: "4" });
    expect(formatChordSymbol("F#m/C#")).toMatchObject({ root: "F♯", quality: "m", extension: "", bass: "C♯" });
    expect(formatChordSymbol("(Em)")).toMatchObject({ root: "E", quality: "m", optional: true });
    expect(formatChordSymbol("N.C.")).toMatchObject({ noChord: true });
  });

  it("uses sharp and flat glyphs and never degree symbols", () => {
    expect(formatChordSymbol("Bb").root).toBe("B♭");
    expect(formatChordSymbol("C#M").root).toBe("C♯");
    expect(JSON.stringify(formatChordSymbol("Bdim"))).not.toContain("°");
    expect(JSON.stringify(formatChordSymbol("Bm7b5"))).not.toContain("ø");
  });
});
