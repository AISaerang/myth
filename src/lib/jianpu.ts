// Parser not angka (JianpuASCII) untuk intro lagu.
//
// Format ketik:
//   nada 1–7, diam 0
//   oktaf atas: ' (satu) / '' (dua) di belakang nada
//   oktaf bawah: , (satu) / ,, (dua) di belakang nada
//   kres/mol: # / b di DEPAN nada
//   ketukan: / = setengah, // = seperempat di belakang nada
//   panjang: - (satu per nada sebelumnya)
//   titik ritme: . di belakang nada
//   birama: | pemisah
//   antar-nada: spasi
//
// Contoh: "6, 5, 1 2 3" → nada 6 oktaf bawah, nada 5 oktaf bawah, nada 1, nada 2, nada 3
// Contoh: "1' 2' 3'" → nada 1, 2, 3 oktaf atas

export interface JianpuNote {
  /** Nada dasar 1–7, atau 0 untuk diam. */
  solfege: number;
  /** Oktaf relatif terhadap nada dasar: 0 = tengah, positif = atas, negatif = bawah. */
  octave: number;
  /** Accidental: 1 = kres (#), -1 = mol (b), 0 = netral. */
  accidental: number;
  /** Durasi: 1 = penuh, 1/2 = setengah (/), 1/4 = seperwart (//). */
  duration: number;
  /** Jumlah tanda panjang (-) tambahan. */
  extension: number;
  /** Apakah ada titik ritme (.). */
  dotted: boolean;
}

export interface JianpuLine {
  /** Teks asli baris ini. */
  raw: string;
  /** Nada-nada yang diurai (tidak termasuk birama/pemisah). */
  notes: JianpuNote[];
}

/** Hasil parsing lengkap. */
export interface JianpuParseResult {
  /** Baris-baris (dipisah oleh birama |). */
  lines: JianpuLine[];
  /** Apakah parsing berhasil tanpa error. */
  valid: boolean;
  /** Pesan error jika ada. */
  error?: string;
}

/** Pemetaan nada dasar ke nomor. */
const SOLFEGE_MAP: Record<string, number> = {
  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "0": 0,
};

function parseOctaveModifiers(suffix: string): { octave: number; rest: string } {
  let octave = 0;
  let rest = suffix;
  // Oktaf atas: ' atau ''
  if (rest.startsWith("''")) { octave += 2; rest = rest.slice(2); }
  else if (rest.startsWith("'")) { octave += 1; rest = rest.slice(1); }
  // Oktaf bawah: , atau ,,
  if (rest.startsWith(",,")) { octave -= 2; rest = rest.slice(2); }
  else if (rest.startsWith(",")) { octave -= 1; rest = rest.slice(1); }
  return { octave, rest };
}

function parseDurationAndExtensions(
  rest: string,
): { duration: number; extension: number; dotted: boolean; rest: string } {
  let duration = 1;
  let extension = 0;
  let dotted = false;

  // Ketukan: // (seperwart) atau / (setengah)
  if (rest.startsWith("//")) { duration = 0.25; rest = rest.slice(2); }
  else if (rest.startsWith("/")) { duration = 0.5; rest = rest.slice(1); }

  // Tanda panjang: satu atau lebih -
  while (rest.startsWith("-")) { extension += 1; rest = rest.slice(1); }

  // Titik ritme: .
  if (rest.startsWith(".")) { dotted = true; rest = rest.slice(1); }

  return { duration, extension, dotted, rest };
}

export function parseJianpu(input: string): JianpuParseResult {
  if (!input || input.trim() === "") {
    return { lines: [], valid: true };
  }

  const lines: JianpuLine[] = [];
  const rawLines = input.split("|");

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (trimmed === "") continue;

    const notes: JianpuNote[] = [];
    const tokens = trimmed.split(/\s+/);

    for (const token of tokens) {
      if (token === "") continue;

      let rest = token;
      let accidental = 0;

      // Accidental di depan
      if (rest.startsWith("#")) { accidental = 1; rest = rest.slice(1); }
      else if (rest.startsWith("b")) { accidental = -1; rest = rest.slice(1); }

      if (rest.length === 0) {
        return {
          lines,
          valid: false,
          error: `Token tidak valid: "${token}" (hanya accidental tanpa nada).`,
        };
      }

      const solfegeChar = rest[0];
      const solfege = SOLFEGE_MAP[solfegeChar];
      if (solfege === undefined) {
        return {
          lines,
          valid: false,
          error: `Nada tidak valid: "${solfegeChar}" dalam token "${token}". Harus 0–7.`,
        };
      }
      rest = rest.slice(1);

      const { octave, rest: afterOctave } = parseOctaveModifiers(rest);
      const { duration, extension, dotted, rest: afterExt } =
        parseDurationAndExtensions(afterOctave);

      if (afterExt.length > 0) {
        return {
          lines,
          valid: false,
          error: `Karakter tidak dikenali: "${afterExt}" dalam token "${token}".`,
        };
      }

      notes.push({
        solfege,
        octave,
        accidental,
        duration,
        extension,
        dotted,
      });
    }

    lines.push({ raw: trimmed, notes });
  }

  return { lines, valid: true };
}

/** Rumus konversi kunci asli ke C (untuk tampilan "C + n = Key"). */
export function keyToFormula(originalKey: string | null | undefined): string {
  if (!originalKey) return "";
  const normalized = originalKey.trim().toUpperCase();
  // Ekstrak nada dasar (A-G), abaikan accidental/modifier untuk perhitungan jarak
  const baseMatch = normalized.match(/^([A-G])/);
  if (!baseMatch) return "";
  const baseNote = baseMatch[1];
  const NOTE_ORDER = ["C", "D", "E", "F", "G", "A", "B"];
  const baseIndex = NOTE_ORDER.indexOf(baseNote);
  if (baseIndex === -1) return "";
  // Jarak semiton dari C ke nada dasar
  const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const semitones = SEMITONES[baseNote as keyof typeof SEMITONES];
  // Handle flats/shifts: Bb = -1 from B, etc.
  let adjusted = semitones;
  if (normalized.includes("b")) adjusted -= 1;
  else if (normalized.includes("#")) adjusted += 1;
  // Jarak terpendek: pakai + jika >= 0, atau konversi ke minus jika lebih pendek
  let sign = "+";
  let value = adjusted;
  if (value > 6) { value = 12 - value; sign = "-"; }
  if (value === 0) return "C = " + originalKey;
  return `C ${sign} ${value} = ${originalKey}`;
}

export function formatNote(note: JianpuNote): string {
  let s = "";
  if (note.accidental === 1) s += "#";
  else if (note.accidental === -1) s += "b";
  s += note.solfege.toString();
  if (note.octave > 0) s += "'".repeat(note.octave);
  else if (note.octave < 0) s += ",".repeat(-note.octave);
  if (note.duration === 0.5) s += "/";
  else if (note.duration === 0.25) s += "//";
  for (let i = 0; i < note.extension; i++) s += "-";
  if (note.dotted) s += ".";
  return s;
}

export function formatLine(line: JianpuLine): string {
  return line.notes.map(formatNote).join(" ");
}

// Teks untuk font JianpuASCII. Kres/mol memakai glyph ligatur font
// (^ = sharp, _ = flat), bukan karakter ketik # / b.
export function toJianpuFontText(note: JianpuNote): string {
  let s = "";
  if (note.accidental === 1) s += "^";
  else if (note.accidental === -1) s += "_";
  s += note.solfege.toString();
  if (note.octave > 0) s += "'".repeat(note.octave);
  else if (note.octave < 0) s += ",".repeat(-note.octave);
  if (note.duration === 0.5) s += "/";
  else if (note.duration === 0.25) s += "//";
  s += "-".repeat(note.extension);
  if (note.dotted) s += ".";
  return s;
}
