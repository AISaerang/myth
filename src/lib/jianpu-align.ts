// Sejajarkan kunci di atas baris not angka.
//
// Di editor, tanda oktaf (' / ,) dan garis ketukan (/) memakan kolom monospace.
// Render CSS melipat tanda itu ke dalam glyph angka (titik di atas/bawah,
// garis bawah) plus kurung slur/beam tidak memakai kolom, jadi pemetaan di
// sini mengikuti kolom editor lalu melipat simbol yang tidak lagi punya
// lebar sendiri, supaya kunci tetap di atas simbol yang sama.
//
// Input yang kelihatan not angka dinormalkan dulu (NBSP/titik unicode/apostrof
// cerdas → ASCII); baris lirik biasa tidak disentuh.

import { layoutChordLine, semitonesBetween } from "@/lib/chords";
import {
  looksLikeNotationLine,
  normalizeNotationChars,
  parseJianpu,
  type JianpuNote,
} from "@/lib/jianpu";

export type NotationTokenKind = "note" | "bar" | "group";

export interface NotationToken {
  kind: NotationTokenKind;
  raw: string;
  sourceCol: number;
  renderCol: number;
  renderWidth: number;
  note: JianpuNote | null;
}

/** Kurva/garis yang membentang di atas beberapa nada (slur/beam). */
export interface NotationGroup {
  kind: "slur" | "beam";
  /** Kolom render nada pertama dalam grup. */
  from: number;
  /** Kolom render terakhir yang tercakup (inclusive). */
  to: number;
}

export interface PlacedChord {
  token: string;
  sourceCol: number;
  renderCol: number;
}

export interface NotationAlignment {
  tokens: NotationToken[];
  chords: PlacedChord[];
  groups: NotationGroup[];
  /** Jumlah kolom tampilan, setelah tanda oktaf/ketukan dilipat. */
  columns: number;
}

// Rumus nada tampilan, cth. basis C ke D → "C + 2 = D".
// Jarak > 6 ditampilkan sebagai langkah turun agar sama dengan keyToFormula.
export function formatTransposeFormula(fromKey: string, toKey: string): string {
  const from = fromKey.trim();
  const to = toKey.trim();
  if (!from || !to) return "";
  try {
    const up = semitonesBetween(from, to);
    if (up === 0) return `${from} = ${to}`;
    if (up <= 6) return `${from} + ${up} = ${to}`;
    return `${from} - ${12 - up} = ${to}`;
  } catch {
    return "";
  }
}

interface GroupFrame {
  kind: "slur" | "beam";
  startRender: number;
  from: number | null;
  to: number | null;
}

function measureToken(
  raw: string,
  note: JianpuNote,
): { collapse: number; width: number } | null {
  const extra = note.extension + (note.dotted ? 1 : 0);
  if (raw.length < extra + 1) return null;
  const collapse = raw.length - extra;
  const tail = "-".repeat(note.extension) + (note.dotted ? "." : "");
  if (raw.slice(collapse) !== tail) return null;
  return { collapse, width: 1 + extra };
}

// Pesan kenapa baris notasi ini tidak bisa dirender, atau null bila barisnya
// tidak kelihatan not angka (lirik biasa) atau memang valid.
export function notationLineError(line: string): string | null {
  if (!/\d/.test(line)) return null;
  const text = normalizeNotationChars(line.trim());
  // 1) Error parse per token nada (digit ditemukan tapi gagal diurai). Token
  //    huruf (lirik seperti "hai") membuat baris diperlakukan sebagai lirik.
  const tokenRe = /\S+/g;
  let match: RegExpExecArray | null;
  let sawDigitToken = false;
  while ((match = tokenRe.exec(text)) !== null) {
    const raw = match[0] as string;
    const inner = raw.replace(/\(|\)|\[\[|\]\]/g, "");
    if (!inner) continue;
    if (!/\d/.test(inner)) {
      if (/^[|.()[\]'',\/#b-]+$/.test(inner)) continue;
      return null; // ada kata lirik → lirik biasa, bukan notasi gagal.
    }
    sawDigitToken = true;
    const parsed = parseJianpu(inner);
    if (!parsed.valid) return parsed.error ?? "Baris notasi tidak valid.";
  }
  if (!sawDigitToken) return null;
  // 2) Keseimbangan kurung slur/beam.
  const openGroups: string[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") openGroups.push("slur");
    else if (ch === ")") {
      if (openGroups.pop() !== "slur") {
        return "Kurung slur tidak seimbang: ')' tanpa '(' lebih dulu.";
      }
    } else if (ch === "[" && text[i + 1] === "[") {
      openGroups.push("beam");
      i += 1;
    } else if (ch === "]" && text[i + 1] === "]") {
      if (openGroups.pop() !== "beam") {
        return "Kurung beam tidak seimbang: ']]' tanpa '[[ lebih dulu.";
      }
      i += 1;
    }
  }
  if (openGroups.length > 0) {
    return `Kurung ${openGroups.join(", ")} belum ditutup.`;
  }
  if (looksLikeNotationLine(line)) return null;
  return "Baris ini tidak kenal pola not angka (0–7).";
}

// null = baris ini lirik biasa (atau kosong), bukan not angka.
export function alignChordsToNotation(
  chordLine: string,
  lyricLine: string,
): NotationAlignment | null {
  if (!lyricLine.trim()) return null;
  const text = looksLikeNotationLine(lyricLine)
    ? normalizeNotationChars(lyricLine)
    : lyricLine;

  const tokens: NotationToken[] = [];
  const groups: NotationGroup[] = [];
  const sourceToRender: number[] = [];
  let renderCol = 0;
  let sawNote = false;
  const openGroups: GroupFrame[] = [];
  let lastNote: { col: number; width: number } | null = null;

  // Selesaikan frame grup: butuh minimal satu nada. dipakai saat menutup "("
  // atau "[["; frame sendiri sudah dikeluarkan dari openGroups.
  const finishGroup = (frame: GroupFrame): boolean => {
    if (frame.from === null || frame.to === null) return false;
    groups.push({ kind: frame.kind, from: frame.from, to: frame.to });
    return true;
  };

  for (let i = 0; i < text.length; ) {
    const ch = text[i] as string;

    if (ch === " " || ch === "\t") {
      sourceToRender.push(renderCol);
      renderCol += 1;
      i += 1;
      continue;
    }
    if (ch === "(" || ch === ")" || (ch === "[" && text[i + 1] === "[") ||
      (ch === "]" && text[i + 1] === "]")) {
      if (ch === "(") {
        openGroups.push({ kind: "slur", startRender: renderCol, from: null, to: null });
        sourceToRender.push(renderCol);
        i += 1;
        continue;
      }
      if (ch === ")") {
        const frame = openGroups.pop();
        if (!frame || frame.kind !== "slur" || !finishGroup(frame)) return null;
        sourceToRender.push(lastNote ? lastNote.col : renderCol);
        i += 1;
        continue;
      }
      if (ch === "[") {
        openGroups.push({ kind: "beam", startRender: renderCol, from: null, to: null });
        sourceToRender.push(renderCol);
        sourceToRender.push(renderCol);
        i += 2;
        continue;
      }
      const frame = openGroups.pop();
      if (!frame || frame.kind !== "beam" || !finishGroup(frame)) return null;
      sourceToRender.push(lastNote ? lastNote.col : renderCol);
      sourceToRender.push(lastNote ? lastNote.col : renderCol);
      i += 2;
      continue;
    }
    if (ch === "|") {
      tokens.push({
        kind: "bar",
        raw: "|",
        sourceCol: i,
        renderCol,
        renderWidth: 1,
        note: null,
      });
      sourceToRender.push(renderCol);
      renderCol += 1;
      i += 1;
      continue;
    }

    let end = i + 1;
    while (
      end < text.length &&
      text[end] !== " " &&
      text[end] !== "\t" &&
      text[end] !== "|" &&
      text[end] !== "(" &&
      text[end] !== ")" &&
      // Beam [[ ]] boleh menempel di belakang nada: "[[5 6]]" → "6" + "]]".
      !(text[end] === "]" && text[end + 1] === "]")
    ) {
      end += 1;
    }
    const raw = text.slice(i, end);
    const parsed = parseJianpu(raw);
    const lineNotes = parsed.lines[0]?.notes;
    if (
      !parsed.valid ||
      parsed.lines.length !== 1 ||
      !lineNotes ||
      lineNotes.length !== 1
    ) {
      return null;
    }
    const note = lineNotes[0] as JianpuNote;
    const measured = measureToken(raw, note);
    if (!measured) return null;

    sawNote = true;
    tokens.push({
      kind: "note",
      raw,
      sourceCol: i,
      renderCol,
      renderWidth: measured.width,
      note,
    });
    for (const frame of openGroups) {
      if (frame.from === null) frame.from = renderCol;
      frame.to = renderCol + measured.width - 1;
    }
    lastNote = { col: renderCol, width: measured.width };
    for (let k = 0; k < raw.length; k += 1) {
      const col =
        k < measured.collapse
          ? renderCol
          : renderCol + 1 + (k - measured.collapse);
      sourceToRender.push(col);
    }
    renderCol += measured.width;
    i = end;
  }

  if (!sawNote) return null;
  if (openGroups.length > 0) return null;

  const endRender = renderCol;
  const chords: PlacedChord[] = [];
  const tokenRe = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(chordLine)) !== null) {
    const sourceCol = match.index;
    const mapped =
      sourceCol < sourceToRender.length
        ? (sourceToRender[sourceCol] as number)
        : endRender + (sourceCol - text.length);
    chords.push({ token: match[0] as string, sourceCol, renderCol: mapped });
  }

  let columns = endRender;
  for (const chord of chords) {
    columns = Math.max(columns, chord.renderCol + Math.max(chord.token.length, 1));
  }

  return { tokens, chords, groups, columns };
}

export function contentHasNotation(chordPro: string): boolean {
  for (const line of chordPro.split("\n")) {
    const layout = layoutChordLine(line);
    if (layout.label || layout.isEmpty) continue;
    if (alignChordsToNotation(layout.chordLine, layout.lyricLine)) return true;
  }
  return false;
}
