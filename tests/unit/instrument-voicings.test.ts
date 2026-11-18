import { describe, expect, it } from "vitest";
import {
  getStandardVoicing,
  resolveInstrumentVoicing,
  shapeChord,
  STANDARD_DICTIONARY,
} from "@/lib/instrument-voicings";

const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const QUALITIES = ["", "m", "7", "maj7", "m7", "sus2", "sus4", "add9", "dim", "aug"];

function frets(shape: { frets: (number | "x")[] } | null | undefined) {
  return shape?.frets.join("") ?? null;
}

describe("standard instrument voicings", () => {
  it("contains the exact open and beginner seed voicings", () => {
    expect(frets(STANDARD_DICTIONARY.C?.guitar)).toBe("x32010");
    expect(STANDARD_DICTIONARY.C?.piano).toEqual({
      lh: ["C2", "G2"],
      rh: ["C4", "E4", "G4"],
    });
    expect(frets(STANDARD_DICTIONARY.G?.guitar)).toBe("320003");
    expect(STANDARD_DICTIONARY.G?.piano).toEqual({
      lh: ["G2", "D3"],
      rh: ["B3", "D4", "G4"],
    });
    expect(frets(STANDARD_DICTIONARY.Am?.guitar)).toBe("x02210");
    expect(STANDARD_DICTIONARY.Am?.piano).toEqual({
      lh: ["A2", "E3"],
      rh: ["C4", "E4", "A4"],
    });
    expect(frets(STANDARD_DICTIONARY.F?.guitar)).toBe("133211");
    expect(STANDARD_DICTIONARY.F?.guitar?.barre).toEqual({
      fret: 1,
      fromString: 0,
      toString: 5,
    });
    expect(frets(STANDARD_DICTIONARY.F?.guitar?.alt?.[0])).toBe("xx3211");
    expect(STANDARD_DICTIONARY.F?.piano).toEqual({
      lh: ["F2", "C3"],
      rh: ["C4", "F4", "A4"],
    });
    expect(frets(STANDARD_DICTIONARY.D?.guitar)).toBe("xx0232");
    expect(STANDARD_DICTIONARY.D?.piano).toEqual({
      lh: ["D2", "A2"],
      rh: ["A3", "D4", "F#4"],
    });
    expect(frets(STANDARD_DICTIONARY.D7?.guitar)).toBe("xx0212");
    expect(STANDARD_DICTIONARY.D7?.piano).toEqual({
      lh: ["D2", "A2"],
      rh: ["A3", "C4", "F#4"],
    });
    expect(frets(STANDARD_DICTIONARY.G7?.guitar)).toBe("320001");
    expect(STANDARD_DICTIONARY.G7?.piano).toEqual({
      lh: ["G2", "D3"],
      rh: ["B3", "F4", "G4"],
    });
  });

  it("covers every root and required chord quality", () => {
    for (const root of ROOTS) {
      for (const quality of QUALITIES) {
        const entry = STANDARD_DICTIONARY[`${root}${quality}`];
        expect(entry?.guitar?.frets, `${root}${quality} guitar`).toHaveLength(6);
        expect(entry?.piano?.lh.length, `${root}${quality} LH`).toBeGreaterThan(0);
        expect(entry?.piano?.rh.length, `${root}${quality} RH`).toBeGreaterThan(0);
      }
    }
  });

  it("normalizes aliases and includes slash-chord bass voicings", () => {
    expect(frets(getStandardVoicing("Amin")?.guitar)).toBe(
      frets(STANDARD_DICTIONARY.Am?.guitar),
    );
    expect(frets(getStandardVoicing("Cmaj7")?.guitar)).toBe(
      frets(getStandardVoicing("CM7")?.guitar),
    );
    const slash = resolveInstrumentVoicing({
      baseSymbol: "G/B",
      sectionOffset: 0,
      capo: 0,
      capoMode: "sounding",
    });
    expect(slash?.piano?.lh[0]).toMatch(/^B/);
    expect(slash?.guitar).not.toBeNull();
    expect(slash?.sounding).toBe("G/B");
  });

  it("uses the looked-up shape for capo mode, without shifting a diagram", () => {
    expect(shapeChord("A", 2)).toBe("G");
    const shapeMode = resolveInstrumentVoicing({
      baseSymbol: "C",
      sectionOffset: 9,
      capo: 2,
      capoMode: "shape",
    });
    expect(shapeMode?.sounding).toBe("A");
    expect(shapeMode?.shape).toBe("G");
    expect(shapeMode?.guitar).toEqual(STANDARD_DICTIONARY.G?.guitar);

    const soundingMode = resolveInstrumentVoicing({
      baseSymbol: "C",
      sectionOffset: 9,
      capo: 2,
      capoMode: "sounding",
    });
    expect(soundingMode?.sounding).toBe("A");
    expect(soundingMode?.shape).toBe("A");
    expect(soundingMode?.guitar).toEqual(STANDARD_DICTIONARY.A?.guitar);
  });

  it("applies only exact guitar overrides and transposes base-C piano overrides", () => {
    const customF = {
      frets: [9, 9, 9, 10, 11, 9] as (number | "x")[],
      fingers: [1, 1, 1, 2, 3, 1],
      barre: { fret: 9, fromString: 0, toString: 5 },
      baseFret: 9,
    };
    const noShiftedGuitarOverride = resolveInstrumentVoicing({
      baseSymbol: "F",
      sectionOffset: 7,
      capo: 0,
      capoMode: "sounding",
      override: { F: { guitar: customF } },
    });
    expect(noShiftedGuitarOverride?.shape).toBe("C");
    expect(noShiftedGuitarOverride?.guitar).not.toEqual(customF);

    const exactGuitarOverride = resolveInstrumentVoicing({
      baseSymbol: "F",
      sectionOffset: 7,
      capo: 0,
      capoMode: "sounding",
      override: { C: { guitar: customF } },
    });
    expect(exactGuitarOverride?.guitar).toEqual(customF);

    const pianoOverride = resolveInstrumentVoicing({
      baseSymbol: "F",
      sectionOffset: 7,
      capo: 0,
      capoMode: "sounding",
      override: {
        F: { piano: { lh: ["C2", "G2"], rh: ["C4", "E4", "G4"] } },
      },
    });
    expect(pianoOverride?.piano).toEqual({
      lh: ["G2", "D2"],
      rh: ["G4", "B4", "D4"],
    });
  });

  it("follows key and section modulation offsets, including reset to C", () => {
    const verse = resolveInstrumentVoicing({
      baseSymbol: "C",
      sectionOffset: 2,
      capo: 0,
      capoMode: "sounding",
    });
    const chorus = resolveInstrumentVoicing({
      baseSymbol: "C",
      sectionOffset: 4,
      capo: 0,
      capoMode: "sounding",
    });
    const resetVerse = resolveInstrumentVoicing({
      baseSymbol: "C",
      sectionOffset: 0,
      capo: 0,
      capoMode: "sounding",
    });
    const resetChorus = resolveInstrumentVoicing({
      baseSymbol: "C",
      sectionOffset: 2,
      capo: 0,
      capoMode: "sounding",
    });
    expect(verse?.sounding).toBe("D");
    expect(chorus?.sounding).toBe("E");
    expect(resetVerse?.sounding).toBe("C");
    expect(resetChorus?.sounding).toBe("D");
    expect(verse?.guitar).toEqual(STANDARD_DICTIONARY.D?.guitar);
    expect(chorus?.guitar).toEqual(STANDARD_DICTIONARY.E?.guitar);
  });

  it("rejects non-chords and invalid capos", () => {
    expect(
      resolveInstrumentVoicing({
        baseSymbol: "N.C.",
        sectionOffset: 0,
        capo: 0,
        capoMode: "sounding",
      }),
    ).toBeNull();
    expect(
      resolveInstrumentVoicing({
        baseSymbol: "[5 6]",
        sectionOffset: 0,
        capo: 0,
        capoMode: "sounding",
      }),
    ).toBeNull();
    expect(() => shapeChord("A", 12)).toThrow();
  });
});
