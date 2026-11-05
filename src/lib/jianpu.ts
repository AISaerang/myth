// Parser not angka untuk intro lagu. Rendering selalu CSS (.jianpu-dot dst),
// bukan font khusus.
//
// Format ketik:
//   nada 1–7, diam 0
//   oktaf atas: ' (satu) / '' (dua) di belakang nada
//   oktaf bawah: , (satu) / ,, (dua) di belakang nada, atau . / .. di DEPAN nada
//   kres/mol: # / b di DEPAN nada
//   ketukan: / = setengah, // = seperempat di belakang nada
//   panjang: - (satu per nada sebelumnya)
//   titik ritme: . di belakang nada
//   birama: | pemisah
//   antar-nada: spasi
//   slur/legato: ( ) meliputi kelompok nada
//   beam: [[ ]] meliputi kelompok nada (1 garis)
//
// Contoh: "6, 5, 1 2 3" → nada 6 oktaf bawah, nada 5 oktaf bawah, nada 1, nada 2, nada 3
// Contoh: "1' 2' 3'" → nada 1, 2, 3 oktaf atas
// Contoh: "(2 3 2)" → slur tiga nada
//
// Input sering berasal dari tempel WA/Word: NBSP, titik unicode (．· •),
// apostrof cerdas, dst. dinormalkan lewat normalizeNotationInput.

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

// ---------------------------------------------------------------------------
// Normalisasi input tempel (WA/Word/web): unicode whitespace, titik unicode,
// apostrof cerdas, dan kurung fullwidth dicocokkan ke ASCII. Hanya diterapkan
// pada baris yang kelihatan not angka agar lirik/chord tidak tersentuh.
// ---------------------------------------------------------------------------

const CHAR_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  // Spasi unicode (NBSP, thin, ideografis, dst).
  for (const ch of "\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000") {
    map[ch] = " ";
  }
  // Titik unicode yang dipakai sebagai titik oktaf/ritme.
  for (const ch of "\uff0e\u00b7\u2022\u2024\u2219\ufe52") {
    map[ch] = ".";
  }
  // Apostrof/kutip cerdas (oktaf atas).
  for (const ch of "\u2018\u2019\u201b\u2032\uff07\u02bc") {
    map[ch] = "'";
  }
  // Koma unicode (oktaf bawah).
  for (const ch of "\uff0c\u3001") {
    map[ch] = ",";
  }
  // Kurung/birama fullwidth.
  map["\uff08"] = "(";
  map["\uff09"] = ")";
  map["\uff5c"] = "|";
  map["\uff3b"] = "[";
  map["\uff3d"] = "]";
  return map;
})();

export function normalizeNotationChars(text: string): string {
  let out = "";
  for (const ch of text) out += CHAR_MAP[ch] ?? ch;
  return out;
}

const GROUP_CHARS_RE = /\(|\)|\[\[|\]\]/g;

// Bentuk isi token nada (tanpa kurung/birama): titik oktaf di depan opsional,
// accidental, digit 0–7, lalu modifier di belakang.
const NOTATION_INNER_RE =
  /^[.]{1,2}[#b]?[0-7]'{0,3},{0,2}[.]{0,1}(?:\/\/|\/)?[-]{0,8}[.]{0,1}$/;
const NOTATION_INNER_PREFIX_RE =
  /^[#b]?[0-7]'{0,3},{0,2}[.]{0,1}(?:\/\/|\/)?[-]{0,8}[.]{0,1}$/;

// Baris kelihatan not angka bila semua tokennya (setelah kurung të pola
// slur/beam dan birama dihapus) berisi digit 0–7 dengan modifier, dan minimal
// satu nada. Lirik seperti "Bapa sentuh" atau "1 2 hai" tidak lolos.
export function looksLikeNotationLine(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  const normalized = normalizeNotationChars(trimmed);
  let sawNote = false;
  for (const match of normalized.matchAll(/\S+/g)) {
    const raw = match[0];
    if (raw === "|") continue;
    const stripped = raw.replace(GROUP_CHARS_RE, "");
    if (!stripped) continue;
    const ok =
      NOTATION_INNER_RE.test(stripped) || NOTATION_INNER_PREFIX_RE.test(stripped);
    if (!ok) return false;
    if (/[0-7]/.test(stripped)) sawNote = true;
  }
  return sawNote;
}

// Normalisasi seluruh konten chart: hanya baris kelihatan not angka yang
// diubah (unicode → ASCII, trim spasi di ujung). Lirik & chord dibiarkan.
export function normalizeNotationInput(content: string): string {
  if (!content) return content;
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) =>
      looksLikeNotationLine(line)
        ? normalizeNotationChars(line).trimEnd()
        : line,
    )
    .join("\n");
}

export function parseJianpu(input: string): JianpuParseResult {
  if (!input || input.trim() === "") {
    return { lines: [], valid: true };
  }
  input = normalizeNotationChars(input);
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
      // Oktaf bawah lewat titik di depan (setara 5, / 5,,): ".5", "..5".
      let dotOctave = 0;
      while (rest.startsWith(".")) {
        dotOctave -= 1;
        rest = rest.slice(1);
      }

      // Accidental di depan
      if (rest.startsWith("#")) { accidental = 1; rest = rest.slice(1); }
      else if (rest.startsWith("b")) { accidental = -1; rest = rest.slice(1); }

      if (rest.length === 0) {
        return {
          lines,
          valid: false,
          error: dotOctave !== 0
            ? `Token tidak valid: "${token}" (hanya titik tanpa nada).`
            : `Token tidak valid: "${token}" (hanya accidental tanpa nada).`,
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
      const octaveTotal = octave + dotOctave;
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
        octave: octaveTotal,
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
