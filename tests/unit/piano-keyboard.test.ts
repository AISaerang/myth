import { describe, expect, it } from "vitest";
import { buildPianoKeyboard } from "@/lib/piano-keyboard";

describe("two-octave piano keyboard", () => {
  it("shows all clamped LH and RH notes on their two-octave ranges", () => {
    const left = buildPianoKeyboard(["E1", "G1", "B1", "C3"], "E1");
    const right = buildPianoKeyboard(["A3", "C4", "F#4", "C5"], "A3");
    expect(left).toHaveLength(24);
    expect(right).toHaveLength(24);
    expect(left.map((key) => key.note).filter(Boolean)).toEqual([
      "E1",
      "G1",
      "B1",
      "C3",
    ]);
    expect(right.map((key) => key.note).filter(Boolean)).toEqual([
      "A3",
      "C4",
      "F#4",
      "C5",
    ]);
  });

  it("identifies black keys and rejects notes outside the displayed octaves", () => {
    const keys = buildPianoKeyboard(["F#4"], "C4");
    expect(keys[6]?.black).toBe(true);
    expect(keys[6]?.note).toBe("F#4");
    expect(() => buildPianoKeyboard(["E3"], "E1")).toThrow(
      "berada di luar keyboard dua oktaf",
    );
  });
});
