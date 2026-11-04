// Parser not angka untuk chart lagu.
//
// Format ketik (string tersimpan tetap kompatibel):
//   nada 1–7, diam 0
//   oktaf atas: ' / '' di BELAKANG nada → titik di atas angka
//   oktaf bawah: , / ,, di belakang, ATAU titik di depan (.6 / ..6) → titik di bawah
//   kres/mol: # / b di depan nada (#4 garis /, b7 garis \)
//   ketukan per nada: / setengah, // seperempat (garis bawah)
//   beam kelompok: [5 6] satu garis di atas, [[5 6 5 6]] dua garis di atas
//   legato: (5 6) busur di atas kelompok
//   panjang: - 
//   titik ritme: . di BELAKANG nada
//   birama: | pemisah
//   antar-nada: spasi
//
// Bentuk kanonik oktaf bawah adalah koma. Titik di depan tetap dibaca.

import { splitChordBrackets } from "@/lib/chords";

export interface JianpuNote {
  /** Nada dasar 1–7, atau 0 untuk diam. */
  solfege: number;
  /** Oktaf relatif terhadap nada dasar: 0 = tengah, positif = atas, negatif = bawah. */
  octave: number;
  /** Accidental: 1 = kres (#), -1 = mol (b), 0 = netral. */
  accidental: number;
  /** Durasi: 1 = penuh, 1/2 = setengah (/), 1/4 = seperempat (//). */
  duration: number;
  /** Jumlah tanda panjang (-) tambahan. */
  extension: number;
  /** Apakah ada titik ritme (.). */
  dotted: boolean;
  /** 0 = tidak ada beam, 1 = satu garis di atas, 2 = dua garis. */
  beam?: number;
  /** Nada dalam satu kurung [ ] / [[ ]] berbagi id yang sama. */
  beamGroup?: number | null;
  /** Nada dalam satu ( ) berbagi id yang sama. */
  slurGroup?: number | null;
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

export interface JianpuSpan {
  kind: "note" | "bar";
  raw: string;
  sourceCol: number;
  note: JianpuNote | null;
  beam: number;
  beamGroup: number | null;
  slurGroup: number | null;
}

export interface JianpuTokenizeResult {
  spans: JianpuSpan[];
  valid: boolean;
  error?: string;
}

const DELIMITERS = new Set([" ", "\t", "|", "[", "]", "(", ")"]);

function failNote(token: string): { error: string } | null {
  if (token === "#" || token === "b") {
    return { error: `Token tidak valid: "${token}" (hanya accidental tanpa nada).` };
  }
  return null;
}

export function parseNoteToken(token: string): JianpuNote | { error: string } {
  const bare = failNote(token);
  if (bare) return bare;

  let i = 0;
  let accidental = 0;
  let octave = 0;

  while (i < token.length && (token[i] === "." || token[i] === "#" || token[i] === "b")) {
    const ch = token[i] as string;
    if (ch === ".") {
      octave -= 1;
      i += 1;
      continue;
    }
    if (accidental !== 0) {
      return { error: `Karakter tidak dikenali: "${token.slice(i)}" dalam token "${token}".` };
    }
    accidental = ch === "#" ? 1 : -1;
    i += 1;
  }

  if (i >= token.length) {
    if (accidental !== 0 && octave === 0) {
      return { error: `Token tidak valid: "${token}" (hanya accidental tanpa nada).` };
    }
    return { error: `Nada tidak valid: "${token}" dalam token "${token}". Harus 0–7.` };
  }

  const solfegeChar = token[i] as string;
  if (!/^[0-7]$/.test(solfegeChar)) {
    return {
      error: `Nada tidak valid: "${solfegeChar}" dalam token "${token}". Harus 0–7.`,
    };
  }
  const solfege = Number(solfegeChar);
  i += 1;

  let sawUp = false;
  let sawDown = false;
  while (i < token.length && (token[i] === "'" || token[i] === ",")) {
    if (token[i] === "'") {
      if (sawDown) {
        return { error: `Karakter tidak dikenali: "${token.slice(i)}" dalam token "${token}".` };
      }
      sawUp = true;
      octave += 1;
    } else {
      if (sawUp) {
        return { error: `Karakter tidak dikenali: "${token.slice(i)}" dalam token "${token}".` };
      }
      sawDown = true;
      octave -= 1;
    }
    i += 1;
  }

  let duration = 1;
  if (token.startsWith("//", i)) {
    duration = 0.25;
    i += 2;
  } else if (token[i] === "/") {
    duration = 0.5;
    i += 1;
  }

  let extension = 0;
  while (token[i] === "-") {
    extension += 1;
    i += 1;
  }

  let dotted = false;
  if (token[i] === ".") {
    dotted = true;
    i += 1;
  }

  if (i < token.length) {
    return { error: `Karakter tidak dikenali: "${token.slice(i)}" dalam token "${token}".` };
  }

  return {
    solfege,
    octave,
    accidental,
    duration,
    extension,
    dotted,
  };
}

function findCloser(
  line: string,
  from: number,
  end: number,
  open: string,
  close: string,
): number {
  let depth = 1;
  let i = from;
  while (i < end) {
    if (open.length === 2 && line.startsWith(open, i)) {
      depth += 1;
      i += open.length;
      continue;
    }
    if (open.length === 1 && line.startsWith(open, i) && !line.startsWith(close, i)) {
      depth += 1;
      i += 1;
      continue;
    }
    if (line.startsWith(close, i)) {
      depth -= 1;
      if (depth === 0) return i;
      i += close.length;
      continue;
    }
    i += 1;
  }
  return -1;
}

export function tokenizeJianpuLine(line: string): JianpuTokenizeResult {
  const spans: JianpuSpan[] = [];
  let beamSerial = 1;
  let slurSerial = 1;

  function walk(
    start: number,
    end: number,
    beam: number,
    beamGroup: number | null,
    slurGroup: number | null,
  ): string | null {
    let i = start;
    let sawNote = false;
    while (i < end) {
      const ch = line[i] as string;
      if (ch === " " || ch === "\t") {
        i += 1;
        continue;
      }
      if (ch === "|") {
        if (beam > 0 || slurGroup !== null) {
          return `Birama tidak bisa di dalam kelompok: "${line.slice(start, end)}".`;
        }
        spans.push({
          kind: "bar",
          raw: "|",
          sourceCol: i,
          note: null,
          beam: 0,
          beamGroup: null,
          slurGroup: null,
        });
        i += 1;
        continue;
      }
      if (ch === "]" || ch === ")") {
        return `Karakter tidak dikenali: "${ch}" dalam token "${ch}".`;
      }
      if (beam === 0 && line.startsWith("[[", i)) {
        const close = findCloser(line, i + 2, end, "[[", "]]");
        if (close < 0) return `Kelompok tidak tertutup: "${line.slice(i, end)}".`;
        const inner = line.slice(i + 2, close).trim();
        if (!inner) return `Kelompok kosong: "${line.slice(i, close + 2)}".`;
        const id = beamSerial++;
        const error = walk(i + 2, close, 2, id, slurGroup);
        if (error) return error;
        sawNote = true;
        i = close + 2;
        continue;
      }
      if (beam === 0 && ch === "[") {
        const close = findCloser(line, i + 1, end, "[", "]");
        if (close < 0) return `Kelompok tidak tertutup: "${line.slice(i, end)}".`;
        const inner = line.slice(i + 1, close).trim();
        if (!inner) return `Kelompok kosong: "${line.slice(i, close + 1)}".`;
        const id = beamSerial++;
        const error = walk(i + 1, close, 1, id, slurGroup);
        if (error) return error;
        sawNote = true;
        i = close + 1;
        continue;
      }
      if (slurGroup === null && ch === "(") {
        const close = findCloser(line, i + 1, end, "(", ")");
        if (close < 0) return `Kelompok tidak tertutup: "${line.slice(i, end)}".`;
        const inner = line.slice(i + 1, close).trim();
        if (!inner) return `Kelompok kosong: "${line.slice(i, close + 1)}".`;
        const id = slurSerial++;
        const error = walk(i + 1, close, beam, beamGroup, id);
        if (error) return error;
        sawNote = true;
        i = close + 1;
        continue;
      }
      if (ch === "[" || ch === "(") {
        return `Karakter tidak dikenali: "${ch}" dalam token "${line.slice(i, end)}".`;
      }

      let j = i + 1;
      while (j < end && !DELIMITERS.has(line[j] as string)) j += 1;
      const raw = line.slice(i, j);
      const parsed = parseNoteToken(raw);
      if ("error" in parsed) return parsed.error;
      spans.push({
        kind: "note",
        raw,
        sourceCol: i,
        note: { ...parsed, beam, beamGroup, slurGroup },
        beam,
        beamGroup,
        slurGroup,
      });
      sawNote = true;
      i = j;
    }
    if ((beam > 0 || slurGroup !== null) && start < end && !sawNote) {
      return `Kelompok kosong: "${line.slice(start, end)}".`;
    }
    return null;
  }

  const error = walk(0, line.length, 0, null, null);
  if (error) return { spans, valid: false, error };
  return { spans, valid: true };
}

export function parseJianpu(input: string): JianpuParseResult {
  if (!input || input.trim() === "") {
    return { lines: [], valid: true };
  }

  const tokenized = tokenizeJianpuLine(input);
  if (!tokenized.valid) {
    return { lines: [], valid: false, error: tokenized.error };
  }

  const lines: JianpuLine[] = [];
  let notes: JianpuNote[] = [];
  let rawStart = 0;

  const push = (end: number) => {
    const raw = input.slice(rawStart, end).trim();
    if (raw && notes.length > 0) lines.push({ raw, notes });
    notes = [];
  };

  for (const span of tokenized.spans) {
    if (span.kind === "bar") {
      push(span.sourceCol);
      rawStart = span.sourceCol + 1;
      continue;
    }
    if (span.note) notes.push(span.note);
  }
  push(input.length);

  return { lines, valid: true };
}

function rewriteLeadingDots(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;
    if (DELIMITERS.has(ch)) {
      out += ch;
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < text.length && !DELIMITERS.has(text[j] as string)) j += 1;
    const token = text.slice(i, j);
    if (token.includes(".") && !/^[0-7]/.test(token)) {
      const parsed = parseNoteToken(token);
      out += "error" in parsed ? token : formatNote(parsed);
    } else {
      out += token;
    }
    i = j;
  }
  return out;
}

/** Ubah oktaf bawah `.6` / `..6` menjadi bentuk kanonik `6,` / `6,,`. Spasi dan chord tetap. Baris lirik tidak diubah. */
export function canonicalizeNotationText(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line) || /^\s*\{[^}]+\}\s*$/.test(line)) return line;
      const parts = splitChordBrackets(line);
      const lyric = parts
        .filter((part) => part.kind === "text")
        .map((part) => part.value)
        .join("");
      const tokenized = tokenizeJianpuLine(lyric);
      if (!tokenized.valid || !tokenized.spans.some((span) => span.kind === "note")) return line;
      return parts
        .map((part) => (part.kind === "chord" ? `[${part.value}]` : rewriteLeadingDots(part.value)))
        .join("");
    })
    .join("\n");
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
// Chart tidak lagi memakai font ini; helper dibiarkan untuk pembanding ligatur.
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
