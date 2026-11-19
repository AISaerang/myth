import { describe, expect, it } from "vitest";
import { buildPianoKeyboard } from "@/lib/piano-keyboard";

describe("two-octave piano keyboard", () => {
  it("shows all clamped LH and RH notes on inclusive two-octave ranges", () => {
    const left = buildPianoKeyboard(["E1", "G1", "B1", "C3"], "E1");
    const right = buildPianoKeyboard(["A3", "C4", "F#4", "C5"], "A3");
    expect(left).toHaveLength(25);
    expect(right).toHaveLength(25);
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

  it("identifies black keys and shifts notes outside the displayed octaves", () => {
    const keys = buildPianoKeyboard(["F#4"], "C4");
    expect(keys[6]?.black).toBe(true);
    expect(keys[6]?.note).toBe("F#4");
    const left = buildPianoKeyboard(["E3"], "E1", "E3");
    expect(left).toHaveLength(25);
    expect(left.find((key) => key.note === "E3")?.midi).toBe(52);
    const shifted = buildPianoKeyboard(["F3"], "E1", "E3");
    expect(shifted.find((key) => key.note === "F2")).toBeDefined();
  });
});
