// Sejajarkan kunci di atas baris not angka.
//
// Di editor, tanda oktaf (' / ,) dan garis ketukan (/) memakan kolom monospace.
// Font JianpuASCII melipat tanda itu ke dalam glyph angka (titik di atas/bawah,
// garis bawah), jadi kolom tampilan bergeser. Pemetaan di sini mengikuti
// kolom editor, lalu melipat tanda yang tidak lagi punya lebar sendiri,
// supaya kunci tetap di atas simbol yang sama.

import { layoutChordLine, semitonesBetween } from "@/lib/chords";
import { parseJianpu, type JianpuNote } from "@/lib/jianpu";

export interface NotationToken {
  kind: "note" | "bar";
  raw: string;
  sourceCol: number;
  renderCol: number;
  renderWidth: number;
  note: JianpuNote | null;
}

export interface PlacedChord {
  token: string;
  sourceCol: number;
  renderCol: number;
}

export interface NotationAlignment {
  tokens: NotationToken[];
  chords: PlacedChord[];
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

// null = baris ini lirik biasa (atau kosong), bukan not angka.
export function alignChordsToNotation(
  chordLine: string,
  lyricLine: string,
): NotationAlignment | null {
  if (!lyricLine.trim()) return null;

  const tokens: NotationToken[] = [];
  const sourceToRender: number[] = [];
  let renderCol = 0;
  let sawNote = false;

  for (let i = 0; i < lyricLine.length; ) {
    const ch = lyricLine[i] as string;
    if (ch === " " || ch === "\t") {
      sourceToRender.push(renderCol);
      renderCol += 1;
      i += 1;
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
      end < lyricLine.length &&
      lyricLine[end] !== " " &&
      lyricLine[end] !== "\t" &&
      lyricLine[end] !== "|"
    ) {
      end += 1;
    }
    const raw = lyricLine.slice(i, end);
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

  const endRender = renderCol;
  const chords: PlacedChord[] = [];
  const tokenRe = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(chordLine)) !== null) {
    const sourceCol = match.index;
    const mapped =
      sourceCol < sourceToRender.length
        ? (sourceToRender[sourceCol] as number)
        : endRender + (sourceCol - lyricLine.length);
    chords.push({ token: match[0] as string, sourceCol, renderCol: mapped });
  }

  let columns = endRender;
  for (const chord of chords) {
    columns = Math.max(columns, chord.renderCol + Math.max(chord.token.length, 1));
  }

  return { tokens, chords, columns };
}

export function contentHasNotation(chordPro: string): boolean {
  for (const line of chordPro.split("\n")) {
    const layout = layoutChordLine(line);
    if (layout.label || layout.isEmpty) continue;
    if (alignChordsToNotation(layout.chordLine, layout.lyricLine)) return true;
  }
  return false;
}
