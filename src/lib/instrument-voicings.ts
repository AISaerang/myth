import {
  noteIndex,
  parseChord,
  transposeChord,
  transposeRoot,
} from "@/lib/chords";
import {
  clampPitch,
  LH_MAX,
  LH_MIN,
  RH_MAX,
  RH_MIN,
  transposePitch,
} from "@/lib/pitch";

export interface GuitarBarre {
  fret: number;
  fromString: number;
  toString: number;
}

export interface GuitarShape {
  frets: (number | "x")[];
  fingers: number[];
  barre: GuitarBarre | null;
  baseFret: number;
  alt?: GuitarShape[];
}

export interface PianoVoicing {
  lh: string[];
  rh: string[];
}

export interface InstrumentVoicing {
  guitar?: GuitarShape;
  piano?: PianoVoicing;
}

export interface ResolvedInstrumentVoicing {
  sounding: string;
  shape: string;
  guitar: GuitarShape | null;
  piano: PianoVoicing | null;
}

interface ChordDefinition {
  suffix: string;
  intervals: number[];
  guitarIntervals: number[];
}

const ROOTS = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
] as const;

const DEFINITIONS: ChordDefinition[] = [
  { suffix: "", intervals: [0, 4, 7], guitarIntervals: [0, 4, 7] },
  { suffix: "m", intervals: [0, 3, 7], guitarIntervals: [0, 3, 7] },
  { suffix: "7", intervals: [0, 4, 7, 10], guitarIntervals: [0, 4, 7, 10] },
  { suffix: "maj7", intervals: [0, 4, 7, 11], guitarIntervals: [0, 4, 7, 11] },
  { suffix: "m7", intervals: [0, 3, 7, 10], guitarIntervals: [0, 3, 7, 10] },
  { suffix: "sus2", intervals: [0, 2, 7], guitarIntervals: [0, 2, 7] },
  { suffix: "sus4", intervals: [0, 5, 7], guitarIntervals: [0, 5, 7] },
  { suffix: "add9", intervals: [0, 2, 4, 7], guitarIntervals: [0, 2, 4, 7] },
  { suffix: "dim", intervals: [0, 3, 6], guitarIntervals: [0, 3, 6] },
  { suffix: "aug", intervals: [0, 4, 8], guitarIntervals: [0, 4, 8] },
];

const OPEN_SHAPES: Record<string, GuitarShape> = {
  C: { frets: ["x", 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], barre: null, baseFret: 1 },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], barre: null, baseFret: 1 },
  Am: { frets: ["x", 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], barre: null, baseFret: 1 },
  D: { frets: ["x", "x", 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], barre: null, baseFret: 1 },
  D7: { frets: ["x", "x", 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], barre: null, baseFret: 1 },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], barre: null, baseFret: 1 },
  F: {
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barre: { fret: 1, fromString: 0, toString: 5 },
    baseFret: 1,
    alt: [{
      frets: ["x", "x", 3, 2, 1, 1],
      fingers: [0, 0, 3, 2, 1, 1],
      barre: { fret: 1, fromString: 4, toString: 5 },
      baseFret: 1,
    }],
  },
};

const OPEN_PIANO: Record<string, PianoVoicing> = {
  C: { lh: ["C2", "G2"], rh: ["C4", "E4", "G4"] },
  G: { lh: ["G2", "D3"], rh: ["B3", "D4", "G4"] },
  Am: { lh: ["A2", "E3"], rh: ["C4", "E4", "A4"] },
  F: { lh: ["F2", "C3"], rh: ["C4", "F4", "A4"] },
  D: { lh: ["D2", "A2"], rh: ["A3", "D4", "F#4"] },
  D7: { lh: ["D2", "A2"], rh: ["A3", "C4", "F#4"] },
  G7: { lh: ["G2", "D3"], rh: ["B3", "F4", "G4"] },
};

const STRING_OPEN_NOTES = [4, 9, 2, 7, 11, 4];

function chordQuality(suffix: string): ChordDefinition | null {
  const normalized = suffix
    .replace(/^min/i, "m")
    .replace(/^M7$/, "maj7")
    .replace(/^maj7$/i, "maj7")
    .replace(/^maj$/i, "")
    .replace(/^min$/, "m");
  return DEFINITIONS.find((item) => item.suffix === normalized) ?? null;
}

function normalizedRoot(root: string, useFlats: boolean): string {
  return transposeRoot(root, 0, useFlats);
}

function normalizedSymbol(symbol: string, useFlats: boolean): string | null {
  try {
    const parsed = parseChord(symbol);
    const definition = chordQuality(parsed.suffix);
    if (!definition) return null;
    const root = normalizedRoot(parsed.root, useFlats);
    if (!parsed.bassRoot) return `${root}${definition.suffix}`;
    const bass = normalizedRoot(parsed.bassRoot, useFlats);
    return `${root}${definition.suffix}/${bass}`;
  } catch {
    return null;
  }
}

function buildGuitarShape(root: string, intervals: number[]): GuitarShape {
  const rootIndex = noteIndex(root);
  let best: { frets: (number | "x")[]; baseFret: number; score: number } | null = null;
  for (let base = 1; base <= 13; base += 1) {
    const frets: (number | "x")[] = [];
    let score = 0;
    let highest = base;
    for (let string = 0; string < 6; string += 1) {
      const candidates = Array.from({ length: 5 }, (_, fret) => base + fret).filter(
        (fret) =>
          intervals.includes(
            ((STRING_OPEN_NOTES[string]! + fret - rootIndex) % 12 + 12) % 12,
          ),
      );
      if (
        base === 1 &&
        intervals.includes((STRING_OPEN_NOTES[string]! - rootIndex + 12) % 12)
      ) {
        candidates.unshift(0);
      }
      const fret = candidates.sort(
        (a, b) => Math.abs(a - (base + (string === 0 ? 0 : 1))) -
          Math.abs(b - (base + (string === 0 ? 0 : 1))) || a - b,
      )[0];
      if (fret === undefined) {
        frets.push("x");
        score += 1;
      } else {
        frets.push(fret);
        highest = Math.max(highest, fret);
        score += Math.abs(fret - (base + (string === 0 ? 0 : 1))) * 0.05;
      }
    }
    const played = frets.filter((fret) => fret !== "x").length;
    score += (highest - base) * 0.1 + (6 - played) * 0.8;
    if (!best || score < best.score) best = { frets, baseFret: base, score };
  }
  const selected = best ?? {
    frets: ["x", 3, 2, 0, 1, 0] as (number | "x")[],
    baseFret: 1,
    score: 0,
  };
  let fingerNumber = 0;
  const fingers = selected.frets.map((fret) => {
    if (fret === "x" || fret === 0) return 0;
    fingerNumber = (fingerNumber % 4) + 1;
    return fingerNumber;
  });
  return {
    frets: selected.frets,
    fingers,
    barre: null,
    baseFret: selected.baseFret,
  };
}

function pitchAt(root: string, octave: number, interval: number): string {
  return `${transposeRoot(root, interval)}${octave}`;
}

function buildPianoVoicing(
  root: string,
  bassRoot: string | null,
  definition: ChordDefinition,
): PianoVoicing {
  const bass = bassRoot ?? root;
  const fifth = transposeRoot(root, 7);
  const lh = [pitchAt(bass, 2, 0), pitchAt(fifth, 2, 0)].map((note) =>
    clampPitch(note, LH_MIN, LH_MAX),
  );
  const rh = definition.intervals.slice(0, 4).map((interval) =>
    clampPitch(pitchAt(root, 4, interval), RH_MIN, RH_MAX),
  );
  return { lh, rh };
}

function createShapeDict() {
  const dictionary: Record<string, InstrumentVoicing> = {};
  for (const root of ROOTS) {
    for (const definition of DEFINITIONS) {
      for (const spelling of [root, transposeRoot(root, 0, true)]) {
        const symbol = `${spelling}${definition.suffix}`;
        dictionary[symbol] = {
          guitar: buildGuitarShape(spelling, definition.guitarIntervals),
          piano: buildPianoVoicing(spelling, null, definition),
        };
        for (const bass of ROOTS) {
          for (const bassSpelling of [bass, transposeRoot(bass, 0, true)]) {
            dictionary[`${symbol}/${bassSpelling}`] = {
              guitar: dictionary[symbol]?.guitar,
              piano: buildPianoVoicing(spelling, bassSpelling, definition),
            };
          }
        }
      }
    }
  }
  for (const [symbol, shape] of Object.entries(OPEN_SHAPES)) {
    dictionary[symbol] = {
      ...dictionary[symbol],
      guitar: shape,
    };
  }
  for (const [symbol, voicing] of Object.entries(OPEN_PIANO)) {
    dictionary[symbol] = {
      ...dictionary[symbol],
      piano: voicing,
    };
  }
  return dictionary;
}

export const STANDARD_DICTIONARY = createShapeDict();

function dictionaryKey(symbol: string, useFlats: boolean): string | null {
  const normalized = normalizedSymbol(symbol, useFlats);
  if (!normalized) return null;
  const parsed = parseChord(normalized);
  const definition = chordQuality(parsed.suffix);
  if (!definition) return null;
  const root = normalizedRoot(parsed.root, useFlats);
  const bass = parsed.bassRoot
    ? `/${normalizedRoot(parsed.bassRoot, useFlats)}`
    : "";
  return `${root}${definition.suffix}${bass}`;
}

export function getStandardVoicing(
  symbol: string,
  useFlats = false,
): InstrumentVoicing | null {
  const key = dictionaryKey(symbol, useFlats);
  return key ? STANDARD_DICTIONARY[key] ?? null : null;
}

function findOverride(
  overrides: Record<string, InstrumentVoicing>,
  normalizedKey: string,
  useFlats: boolean,
): InstrumentVoicing | undefined {
  return Object.entries(overrides).find(
    ([symbol]) => dictionaryKey(symbol, useFlats) === normalizedKey,
  )?.[1];
}

export function shapeChord(
  soundingSymbol: string,
  capo: number,
  useFlats = false,
): string {
  if (!Number.isInteger(capo) || capo < 0 || capo > 11) {
    throw new Error("Capo harus berupa bilangan bulat 0–11.");
  }
  return transposeChord(soundingSymbol, -capo, useFlats);
}

function transposeAndClampPiano(
  voicing: PianoVoicing,
  semitones: number,
  useFlats: boolean,
): PianoVoicing {
  return {
    lh: voicing.lh.map((note) =>
      clampPitch(transposePitch(note, semitones, useFlats), LH_MIN, LH_MAX),
    ),
    rh: voicing.rh.map((note) =>
      clampPitch(transposePitch(note, semitones, useFlats), RH_MIN, RH_MAX),
    ),
  };
}

export function resolveInstrumentVoicing({
  baseSymbol,
  sectionOffset,
  capo,
  capoMode,
  useFlats = false,
  override = {},
}: {
  baseSymbol: string;
  sectionOffset: number;
  capo: number;
  capoMode: "shape" | "sounding";
  useFlats?: boolean;
  override?: Record<string, InstrumentVoicing>;
}): ResolvedInstrumentVoicing | null {
  let parsed;
  try {
    parsed = parseChord(baseSymbol);
  } catch {
    return null;
  }
  const definition = chordQuality(parsed.suffix);
  if (!definition) return null;
  const root = normalizedRoot(parsed.root, useFlats);
  const bass = parsed.bassRoot ? normalizedRoot(parsed.bassRoot, useFlats) : null;
  const normalizedBase = `${root}${definition.suffix}${bass ? `/${bass}` : ""}`;
  if (!Number.isInteger(sectionOffset)) {
    throw new Error("Offset bagian harus berupa bilangan bulat.");
  }
  const sounding = transposeChord(normalizedBase, sectionOffset, useFlats);
  const shape =
    capoMode === "shape" && capo > 0
      ? shapeChord(sounding, capo, useFlats)
      : sounding;
  const lookupKey = dictionaryKey(shape, useFlats);
  const baseKey = dictionaryKey(normalizedBase, useFlats);
  if (!lookupKey || !baseKey) return null;

  const requestedOverride = findOverride(override, lookupKey, useFlats);
  const chordOnlyLookup = lookupKey.split("/")[0] ?? lookupKey;
  const guitar =
    requestedOverride?.guitar ??
    STANDARD_DICTIONARY[lookupKey]?.guitar ??
    STANDARD_DICTIONARY[chordOnlyLookup]?.guitar;
  const pianoOverride = findOverride(override, baseKey, useFlats)?.piano;
  const piano = pianoOverride
    ? transposeAndClampPiano(pianoOverride, sectionOffset, useFlats)
    : STANDARD_DICTIONARY[dictionaryKey(sounding, useFlats) ?? ""]?.piano ??
      buildPianoVoicing(
        transposeRoot(root, sectionOffset, useFlats),
        bass ? transposeRoot(bass, sectionOffset, useFlats) : null,
        definition,
      );
  return {
    sounding,
    shape,
    guitar: guitar ?? null,
    piano,
  };
}
