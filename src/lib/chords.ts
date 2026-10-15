// Chord engine: ChordPro inline ([Am]lirik), transpose, normalisasi ke C,
// dan 3 mode tampil (lirik / chord / keduanya).
//
// Aturan tim: semua chart disimpan dengan nada dasar C agar seragam;
// transpose hanya terjadi saat tampil (latihan) atau saat normalisasi
// input dari nada asal.

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const BASE_KEY = "C";

function normalizeRoot(root: string): string {
  const letter = root[0]?.toUpperCase() ?? "";
  const acc = root.slice(1);
  if (!"ABCDEFG".includes(letter)) throw new Error(`Nada tidak valid: ${root}`);
  // Enharmonic yang jarang ditulis dinormalkan dulu.
  const key = letter + acc;
  if (key === "B#" || key === "Cb") return key === "B#" ? "C" : "B";
  if (key === "E#" || key === "Fb") return key === "E#" ? "F" : "E";
  return key;
}

export function noteIndex(note: string): number {
  const n = normalizeRoot(note);
  let idx = SHARP.indexOf(n);
  if (idx === -1) idx = FLAT.indexOf(n);
  if (idx === -1) throw new Error(`Nada tidak valid: ${note}`);
  return idx;
}

function indexToNote(idx: number, useFlats: boolean): string {
  const names = useFlats ? FLAT : SHARP;
  return names[((idx % 12) + 12) % 12] as string;
}

interface ParsedChord {
  root: string;
  suffix: string;
  bassRoot: string | null;
  bassSuffix: string;
}

// "D/F#" -> { root D, suffix "", bass F# }; "Am7" -> { root A, suffix m7 }
export function parseChord(token: string): ParsedChord {
  const [main = "", ...bassParts] = token.split("/");
  const bass = bassParts.join("/");
  const mainMatch = /^([A-Ga-g][#b]?)(.*)$/.exec(main.trim());
  if (!mainMatch) throw new Error(`Chord tidak valid: ${token}`);
  const result: ParsedChord = {
    root: normalizeRoot(mainMatch[1] as string),
    suffix: mainMatch[2] ?? "",
    bassRoot: null,
    bassSuffix: "",
  };
  if (bass) {
    const bassMatch = /^([A-Ga-g][#b]?)(.*)$/.exec(bass.trim());
    if (!bassMatch) throw new Error(`Bass chord tidak valid: ${token}`);
    result.bassRoot = normalizeRoot(bassMatch[1] as string);
    result.bassSuffix = bassMatch[2] ?? "";
  }
  return result;
}

export function transposeChord(
  token: string,
  semitones: number,
  useFlats = false,
): string {
  const chord = parseChord(token);
  const root = indexToNote(noteIndex(chord.root) + semitones, useFlats);
  if (!chord.bassRoot) return `${root}${chord.suffix}`;
  const bass = indexToNote(noteIndex(chord.bassRoot) + semitones, useFlats);
  return `${root}${chord.suffix}/${bass}${chord.bassSuffix}`;
}

// Jarak naik (0-11) dari nada `from` ke `to`.
export function semitonesBetween(from: string, to: string): number {
  return (noteIndex(to) - noteIndex(from) + 12) % 12;
}

// Geser satu nada dasar (untuk label "Nada: X" di viewer).
export function transposeRoot(
  root: string,
  semitones: number,
  useFlats = false,
): string {
  return indexToNote(noteIndex(root) + semitones, useFlats);
}

// Geser semua [Chord] dalam konten ChordPro.
export function transposeContent(
  content: string,
  semitones: number,
  useFlats = false,
): string {
  if (semitones % 12 === 0) return content;
  return content.replace(/\[([^\]]+)\]/g, (_match, token: string) => {
    try {
      return `[${transposeChord(token.trim(), semitones, useFlats)}]`;
    } catch {
      // Token bukan chord valid: biarkan apa adanya, jangan rusak lirik.
      return `[${token}]`;
    }
  });
}

// Normalisasi chart dari nada asal ke C (basis seragam tim).
export function normalizeToC(content: string, originalKey: string): string {
  const rootMatch = /^([A-Ga-g][#b]?)/.exec(originalKey.trim());
  if (!rootMatch) throw new Error(`Nada dasar tidak valid: ${originalKey}`);
  return transposeContent(content, semitonesBetween(rootMatch[1] as string, BASE_KEY));
}

// Mode lirik saja: buang [chord], tandai {label} sebagai teks biasa.
export function stripChords(content: string): string {
  return content
    .replace(/\[([^\]]+)\]/g, "")
    .replace(/\{([^}]+)\}/g, (_m, label: string) => label.trim());
}

// Mode chord saja: tiap baris menjadi urutan chord-nya; baris tanpa
// chord (termasuk label seksi) tetap ditampilkan sebagai pemisah.
export function extractChordLines(content: string): string[] {
  return content.split("\n").map((line) => {
    const chords: string[] = [];
    line.replace(/\[([^\]]+)\]/g, (_m, token: string) => {
      chords.push(token.trim());
      return "";
    });
    if (chords.length > 0) return chords.join("  ");
    const label = /^\s*\{([^}]+)\}\s*$/.exec(line);
    if (label) return `— ${(label[1] as string).trim()} —`;
    return "";
  });
}

// Daftar semua chord unik (untuk validasi/preview).
export function listChords(content: string): string[] {
  const seen = new Set<string>();
  content.replace(/\[([^\]]+)\]/g, (_m, token: string) => {
    const t = token.trim();
    try {
      parseChord(t);
      seen.add(t);
    } catch {
      // abaikan
    }
    return "";
  });
  return [...seen];
}
