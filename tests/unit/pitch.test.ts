import { describe, expect, it } from "vitest";
import {
  clampPitch,
  LH_MAX,
  LH_MIN,
  parsePitch,
  RH_MAX,
  RH_MIN,
  transposePitch,
} from "@/lib/pitch";

describe("scientific pitch helpers", () => {
  it("parses naturals and accidentals as MIDI pitches", () => {
    expect(parsePitch("C4")).toBe(60);
    expect(parsePitch("F#4")).toBe(66);
    expect(parsePitch("Bb2")).toBe(46);
    expect(parsePitch("B#4")).toBe(72);
    expect(parsePitch("Cb4")).toBe(59);
  });

  it("transposes while keeping the input accidental style where possible", () => {
    expect(transposePitch("Bb2", 2)).toBe("C3");
    expect(transposePitch("Bb2", 1)).toBe("B2");
    expect(transposePitch("F#4", 1)).toBe("G4");
    expect(transposePitch("C4", 1, true)).toBe("Db4");
  });

  it("rejects malformed pitches and fractional transpositions", () => {
    expect(() => parsePitch("H4")).toThrow();
    expect(() => parsePitch("C#")).toThrow();
    expect(() => parsePitch("C10")).toThrow();
    expect(() => transposePitch("C4", 0.5)).toThrow();
  });

  it("clamps by octaves into the piano registers", () => {
    expect(clampPitch("C0", LH_MIN, LH_MAX)).toBe("C2");
    expect(clampPitch("D4", LH_MIN, LH_MAX)).toBe("D3");
    expect(clampPitch("C2", RH_MIN, RH_MAX)).toBe("C4");
    expect(clampPitch("D6", RH_MIN, RH_MAX)).toBe("D4");
    expect(clampPitch("F3", "C4", "D4")).toBe("D4");
    expect(clampPitch("E3", LH_MIN, LH_MAX)).toBe("E3");
    expect(clampPitch("F3", LH_MIN, LH_MAX)).toBe("F2");
  });
});
