// Sejajarkan kunci di atas baris not angka.
//
// Di editor, tanda oktaf (' / , / titik di depan), garis ketukan (/),
// kurung beam, dan kurung legato memakan kolom monospace. Saat tampil
// tanda itu dilipat ke dalam angka (titik, garis, busur) supaya kunci
// tetap di kolom yang sama dengan nadanya.

import { layoutChordLine, semitonesBetween } from "@/lib/chords";
import { tokenizeJianpuLine, type JianpuNote } from "@/lib/jianpu";

export interface NotationToken {
  kind: "note" | "bar";
  raw: string;
  sourceCol: number;
  renderCol: number;
  renderWidth: number;
  note: JianpuNote | null;
  beam: number;
  beamGroup: number | null;
  slurGroup: number | null;
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

function consumeGap(
  lyricLine: string,
  sourceToRender: number[],
  from: number,
  until: number,
  renderCol: number,
): number {
  const pending: number[] = [];
  let col = renderCol;
  for (let i = from; i < until; i += 1) {
    const ch = lyricLine[i] as string;
    if (ch === " " || ch === "\t") {
      sourceToRender[i] = col;
      col += 1;
      continue;
    }
    // Kurung beam/legato tidak punya lebar. Mereka menempel ke nada berikutnya.
    pending.push(i);
  }
  for (const index of pending) sourceToRender[index] = col;
  return col;
}

// null = baris ini lirik biasa (atau kosong), bukan not angka.
export function alignChordsToNotation(
  chordLine: string,
  lyricLine: string,
): NotationAlignment | null {
  if (!lyricLine.trim()) return null;

  const tokenized = tokenizeJianpuLine(lyricLine);
  if (!tokenized.valid || !tokenized.spans.some((span) => span.kind === "note")) {
    return null;
  }

  const tokens: NotationToken[] = [];
  const sourceToRender: number[] = Array(lyricLine.length).fill(0);
  let renderCol = 0;
  let cursor = 0;

  for (const span of tokenized.spans) {
    renderCol = consumeGap(lyricLine, sourceToRender, cursor, span.sourceCol, renderCol);
    cursor = span.sourceCol;

    if (span.kind === "bar") {
      tokens.push({
        kind: "bar",
        raw: "|",
        sourceCol: span.sourceCol,
        renderCol,
        renderWidth: 1,
        note: null,
        beam: 0,
        beamGroup: null,
        slurGroup: null,
      });
      sourceToRender[span.sourceCol] = renderCol;
      renderCol += 1;
      cursor = span.sourceCol + 1;
      continue;
    }

    const note = span.note;
    if (!note) return null;
    const measured = measureToken(span.raw, note);
    if (!measured) return null;

    tokens.push({
      kind: "note",
      raw: span.raw,
      sourceCol: span.sourceCol,
      renderCol,
      renderWidth: measured.width,
      note,
      beam: span.beam,
      beamGroup: span.beamGroup,
      slurGroup: span.slurGroup,
    });
    for (let k = 0; k < span.raw.length; k += 1) {
      const col =
        k < measured.collapse ? renderCol : renderCol + 1 + (k - measured.collapse);
      sourceToRender[span.sourceCol + k] = col;
    }
    renderCol += measured.width;
    cursor = span.sourceCol + span.raw.length;
  }
  consumeGap(lyricLine, sourceToRender, cursor, lyricLine.length, renderCol);

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

/** True bila isi bagian hanya not angka (plus kunci, komentar, atau baris kosong). */
export function contentIsNotationSection(content: string): boolean {
  let notes = false;
  let lyrics = false;
  for (const line of content.split("\n")) {
    if (!line.trim() || /^\s*#/.test(line) || /^\s*\{[^}]+\}\s*$/.test(line)) continue;
    const layout = layoutChordLine(line);
    if (layout.label) continue;
    const lyric = layout.lyricLine.trim();
    if (!lyric) continue;
    if (alignChordsToNotation(layout.chordLine, layout.lyricLine)) notes = true;
    else lyrics = true;
  }
  return notes && !lyrics;
}

export function contentHasNotation(chordPro: string): boolean {
  for (const line of chordPro.split("\n")) {
    const layout = layoutChordLine(line);
    if (layout.label || layout.isEmpty) continue;
    if (alignChordsToNotation(layout.chordLine, layout.lyricLine)) return true;
  }
  return false;
}
