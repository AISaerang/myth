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

import { looksLikeNotationLine } from "@/lib/jianpu";

// ---------------------------------------------------------------------------
// Token ChordPro inline: [Chord] = chord; [[ ... ]] = literal (beam notation
// di baris not angka) dan tidak boleh dianggap chord.
// ---------------------------------------------------------------------------

// Terapkan pemetaan hanya ke token chord; [[ ... ]] dilewati apa adanya.
function mapInlineChords(
  content: string,
  map: (token: string) => string,
): string {
  return content.replace(
    /\[\[[^[\]]*\]\]|\[([^\][]+)\]/g,
    (match, token: string | undefined) => {
      if (token === undefined) return match; // [[...]] literal
      return `[${map(token)}]`;
    },
  );
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

// Geser tiap token chord pada satu baris spasi (kunci intro / baris atas),
// mempertahankan kolom awal. Chord yang memanjang (C → C#) tidak menelan
// token berikutnya: token itu digeser satu spasi bila kolomnya tertimpa.
export function transposeSpacedChords(
  line: string,
  semitones: number,
  useFlats = false,
): string {
  if (semitones % 12 === 0 && !useFlats) return line;
  const placed: { token: string; col: number }[] = [];
  const tokenRe = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(line)) !== null) {
    const raw = match[0] as string;
    let token = raw;
    if (raw !== "|") {
      try {
        token = transposeChord(raw, semitones, useFlats);
      } catch {
        token = raw;
      }
    }
    placed.push({ token, col: match.index });
  }
  let out = "";
  for (const item of placed) {
    const pos = item.col < out.length ? out.length + 1 : item.col;
    out = out.padEnd(pos, " ") + item.token;
  }
  return out;
}

// Geser semua [Chord] dalam konten ChordPro. Literal [[ ... ]] (beam not
// angka) dilewati.
export function transposeContent(
  content: string,
  semitones: number,
  useFlats = false,
): string {
  if (semitones % 12 === 0) return content;
  return mapInlineChords(content, (token) => {
    try {
      return transposeChord(token.trim(), semitones, useFlats);
    } catch {
      // Token bukan chord valid: biarkan apa adanya, jangan rusak lirik.
      return token;
    }
  });
}

// Normalisasi chart dari nada asal ke C (basis seragam tim).
export function normalizeToC(content: string, originalKey: string): string {
  const rootMatch = /^([A-Ga-g][#b]?)/.exec(originalKey.trim());
  if (!rootMatch) throw new Error(`Nada dasar tidak valid: ${originalKey}`);
  return transposeContent(content, semitonesBetween(rootMatch[1] as string, BASE_KEY));
}

export interface ChordLyricLayout {
  chordLine: string;
  lyricLine: string;
  label: string | null;
  isEmpty: boolean;
}

// Susun satu baris ChordPro menjadi dua baris teks: chord di atas lirik.
// Kolom chord mengikuti posisi karakter lirik agar sejajar pada font monospace.
export function layoutChordLine(line: string): ChordLyricLayout {
  const labelMatch = /^\s*\{([^}]+)\}\s*$/.exec(line);
  if (labelMatch) {
    return {
      chordLine: "",
      lyricLine: "",
      label: (labelMatch[1] as string).trim(),
      isEmpty: false,
    };
  }

  const hasLyric = stripChords(line).replace(/[{}]/g, "").trim() !== "";
  if (!hasLyric) {
    // Baris chord saja: pertahankan spasi asli di antara chord.
    const chordLine = line.replace(/\[([^\]]+)\]/g, (_m, token: string) =>
      token.trim(),
    );
    if (chordLine.trim() === "") {
      return {
        chordLine: "",
        lyricLine: "",
        label: null,
        isEmpty: line.trim() === "",
      };
    }
    return {
      chordLine,
      lyricLine: " ".repeat(chordLine.length),
      label: null,
      isEmpty: false,
    };
  }

  let chordLine = "";
  let lyricLine = "";
  let column = 0;
  // [[ ... ]] literal (beam not angka) = teks lirik, bukan chord.
  const tokens = /\[\[[^[\]]*\]\]|\[([^\][]+)\]|\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokens.exec(line)) !== null) {
    const text = line.slice(lastIndex, match.index);
    lyricLine += text;
    column += text.length;

    if (match[1] !== undefined) {
      const chord = match[1].trim();
      const position =
        column > chordLine.length
          ? column
          : chordLine.length + (chordLine.length > 0 ? 1 : 0);
      chordLine = chordLine.padEnd(position, " ") + chord;
    } else if (match[2] !== undefined) {
      const label = (match[2] as string).trim();
      lyricLine += label;
      column += label.length;
    } else {
      // Literal [[ ... ]]: masuk ke lirik apa adanya supaya parser nota bisa
      // membaca tanda beam.
      lyricLine += match[0] as string;
      column += (match[0] as string).length;
    }
    lastIndex = match.index + match[0].length;
  }

  const tail = line.slice(lastIndex);
  lyricLine += tail;

  const width = Math.max(chordLine.length, lyricLine.length);
  return {
    chordLine: chordLine.padEnd(width, " "),
    lyricLine: lyricLine.padEnd(width, " "),
    label: null,
    isEmpty: line.trim() === "",
  };
}

// Mode lirik saja: buang [chord] ([[ ... ]] literal tetap), tandai {label}.
export function stripChords(content: string): string {
  return content
    .replace(
      /\[\[[^[\]]*\]\]|\[([^\][]+)\]/g,
      (match, token: string | undefined) => (token === undefined ? match : ""),
    )
    .replace(/\{([^}]+)\}/g, (_m, label: string) => label.trim());
}

// Mode chord saja: tiap baris menjadi urutan chord-nya; baris tanpa
// chord (termasuk label seksi) tetap ditampilkan sebagai pemisah.
export function extractChordLines(content: string): string[] {
  return content.split("\n").map((line) => {
    const chords: string[] = [];
    mapInlineChords(line, (token) => {
      chords.push(token.trim());
      return "";
    });
    // [[ ... ]] literal bukan chord; mode chord abaikan.
    if (chords.length > 0) return chords.join("  ");
    const label = /^\s*\{([^}]+)\}\s*$/.exec(line);
    if (label) return `— ${(label[1] as string).trim()} —`;
    return "";
  });
}

// ---------------------------------------------------------------------------
// Format edit "kunci di atas lirik" (over-under):
//
//   G         D/F#
//   Bapa sentuh hati-ku
//
// Editor menulis dalam format ini dan hasilnya dikonversi ke/dari ChordPro
// ([bracket]) saat simpan/muat. Format tersimpan tetap ChordPro basis C.
// ---------------------------------------------------------------------------

// Regex chord yang cukup ketat agar baris lirik biasa (cth. "Bapa", "Do")
// tidak salah dikenali sebagai baris chord.
const CHORD_TOKEN_RE =
  /^[A-G][#b]?(m|maj|min|sus|dim|aug|add|M)?\d*(?:[#b]\d*)?(\/[A-G][#b]?(?:m|sus\d|add\d)?\d*)?$/;

const LABEL_LINE_RE = /^\s*\{([^}]+)\}\s*$/;

interface OverUnderChord {
  token: string;
  col: number;
}

interface ChordLineParse {
  chords: OverUnderChord[];
  trailing: string[]; // token non-chord (mis. "|") yang dipertahankan
}

function parseOverUnderChordLine(line: string): ChordLineParse | null {
  if (!line.trim()) return null;
  const chords: OverUnderChord[] = [];
  const trailing: string[] = [];
  const tokenRe = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(line)) !== null) {
    const token = match[0] as string;
    if (token === "|") {
      trailing.push(token);
      continue;
    }
    // Baris berawal bracket bukan baris chord editor (itu ChordPro/literal).
    if (token.startsWith("[")) return null;
    if (!CHORD_TOKEN_RE.test(token)) return null;
    chords.push({ token, col: match.index });
  }
  return chords.length > 0 ? { chords, trailing } : null;
}

// Batas yang diizinkan untuk posisi chord di baris not angka: mulai/akhir
// token whitespace (termasuk ujung baris). Chord tidak boleh membelah token
// nada (mis. "1-" atau ".6)") saat dipetakan ke ChordPro.
function snapNotationChordPos(lyric: string, col: number): number {
  const boundaries = new Set<number>([0, lyric.length]);
  for (const match of lyric.matchAll(/\S+/g)) {
    boundaries.add(match.index);
    boundaries.add(match.index + (match[0] as string).length);
  }
  if (col >= lyric.length || boundaries.has(col)) return col;
  let best = col;
  let bestDist = Infinity;
  for (const boundary of boundaries) {
    const dist = Math.abs(boundary - col);
    // Seri jarak: ambil batas lebih kiri agar chord tidak melesat ke kanan.
    if (dist < bestDist || (dist === bestDist && boundary < best)) {
      best = boundary;
      bestDist = dist;
    }
  }
  return best;
}

// Sisipkan [chord] ke teks lirik sesuai kolom. Pemetaan kolom-eksak: chord
// tetap di kolom tempat dia berada (termasuk di atas spasi). Kolom di luar
// panjang baris lirik diwakili spasi di akhir baris, jadi kunci yang
// diletakkan setelah lirik habis tetap melayang di tempat itu saat render.
// Untuk baris not angka (notation=true), kolom chord disnap ke batas token
// supaya ChordPro tidak membelah token nada atau menyisip chord di dalam
// kurung slur/beam.
function mergeOverUnderLine(
  chords: OverUnderChord[],
  lyric: string,
  notation = false,
): string {
  const byPos = new Map<number, string[]>();
  let lastPos = -1;
  for (const { token, col } of chords) {
    const target = notation ? snapNotationChordPos(lyric, col) : col;
    // Jaga urutan chord tetap naik bila kolomnya menimpa/mundur.
    const pos = Math.max(target, lastPos);
    lastPos = pos;
    const existing = byPos.get(pos) ?? [];
    existing.push(token);
    byPos.set(pos, existing);
  }

  const parts: string[] = [];
  let cursor = 0;
  for (const pos of [...byPos.keys()].sort((a, b) => a - b)) {
    const text = lyric.slice(cursor, pos);
    // Kunci di luar akhir lirik: buat gap pakai spasi agar kolomnya terjaga.
    const pad = Math.max(0, pos - (cursor + text.length));
    parts.push(text, " ".repeat(pad), byPos.get(pos)!.map((t) => `[${t}]`).join(""));
    cursor = pos;
  }
  parts.push(lyric.slice(cursor));
  return parts.join("");
}

// Ubah baris chord-only menjadi ChordPro, spasi asli dipertahankan.
// Literal [[ ... ]] bukan chord editor; tolak barisnya seperti lirik biasa.
function serializeChordOnly(line: string): string {
  return line.replace(/\S+/g, (token) => {
    if (token.startsWith("[[")) return token;
    return token === "|" || CHORD_TOKEN_RE.test(token) ? `[${token}]` : token;
  });
}

// Ubah karakter tab (mis. dari keyboard HP) menjadi spasi hingga tab-stop,
// sama seperti cara browser merender \t di textarea — supaya kolom yang
// terlihat di editor selalu sama dengan kolom yang dihitung konversi.
export function expandTabs(text: string, tabSize = 8): string {
  const out: string[] = [];
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    let col = 0;
    const builder: string[] = [];
    for (const ch of line) {
      if (ch === "\t") {
        const pad = tabSize - (col % tabSize);
        builder.push(" ".repeat(pad));
        col += pad;
      } else {
        builder.push(ch);
        col++;
      }
    }
    out.push(builder.join(""));
  }
  return out.join("\n");
}

// ChordPro -> format edit over-under (kunci di atas, lirik di bawah).
export function chordProToOverUnder(content: string): string {
  const outLines: string[] = [];
  for (const line of expandTabs(content).split("\n")) {
    if (LABEL_LINE_RE.test(line)) {
      outLines.push(line.trim());
      continue;
    }
    if (!/\[[^\]]+\]/.test(line)) {
      // Baris lirik/label tanpa chord: tulis apa adanya.
      outLines.push(line);
      continue;
    }
    // Token [..] yang bukan chord valid tidak bisa direpresentasikan di
    // format over-under; barisnya dibiarkan mentah agar tidak rusak.
    // Literal [[ ... ]] dilewati (bukan chord).
    let allTokensValid = true;
    line.replace(
      /\[\[[^[\]]*\]\]|\[([^\][]+)\]/g,
      (_m, token: string | undefined) => {
        if (token === undefined) return "";
        try {
          parseChord(token.trim());
        } catch {
          allTokensValid = false;
        }
        return "";
      },
    );
    if (!allTokensValid) {
      outLines.push(line);
      continue;
    }

    const layout = layoutChordLine(line);
    const chordLine = layout.chordLine.trimEnd();
    if (!layout.lyricLine.trim()) {
      outLines.push(chordLine);
      continue;
    }
    // Spasi di akhir baris lirik dipertahankan sampai kolom awal kunci
    // terakhir: itulah cara gap "kunci setelah lirik habis" direpresentasikan.
    const lyricEnd = layout.lyricLine.trimEnd().length;
    const chordTail = /\S+$/.exec(chordLine)?.[0] ?? "";
    const lastChordStart = Math.max(0, chordLine.length - chordTail.length);
    const cap = Math.max(lyricEnd, lastChordStart);
    outLines.push(chordLine, layout.lyricLine.slice(0, cap));
  }
  return outLines.join("\n");
}

// Format edit over-under -> ChordPro. Chord di baris atas dipetakan ke kolom
// suku kata lirik di baris bawahnya; baris tanpa lirik jadi baris chord-only.
export function overUnderToChordPro(content: string): string {
  const lines = expandTabs(content).split("\n");
  const outLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (!line.trim() || LABEL_LINE_RE.test(line)) {
      outLines.push(line);
      continue;
    }
    const chordLine = parseOverUnderChordLine(line);
    if (!chordLine) {
      outLines.push(line);
      continue;
    }
    const next = lines[i + 1];
    if (
      next &&
      next.trim() &&
      !LABEL_LINE_RE.test(next) &&
      !parseOverUnderChordLine(next)
    ) {
      // Baris not angka butuh snap batas token agar chord tidak masuk tengah
      // not atau kurung slur/beam.
      outLines.push(
        mergeOverUnderLine(chordLine.chords, next, looksLikeNotationLine(next)),
      );
      i++;
      continue;
    }
    outLines.push(serializeChordOnly(line));
  }
  return outLines.join("\n");
}

// Heuristik deteksi format tempel: false kalau sudah ChordPro ([bracket]);
// true kalau ada pasangan baris chord di atas baris lirik.
export function isOverUnderFormat(content: string): boolean {
  if (/\[[^\]\n]+\]/.test(content)) return false;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!parseOverUnderChordLine(lines[i] as string)) continue;
    const next = lines[i + 1] as string;
    if (
      next.trim() &&
      !LABEL_LINE_RE.test(next) &&
      !parseOverUnderChordLine(next)
    ) {
      return true;
    }
  }
  return false;
}

// Daftar semua chord unik (untuk validasi/preview). Literal [[ ... ]] dihitung
// satu token literal, bukan chord.
export function listChords(content: string): string[] {
  const seen = new Set<string>();
  mapInlineChords(content, (token) => {
    const t = token.trim();
    try {
      parseChord(t);
      seen.add(t);
    } catch {
      // abaikan
    }
    return t;
  });
  return [...seen];
}
