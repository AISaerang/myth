import { alignChordsToNotation, notationLineError } from "@/lib/jianpu-align";
import {
  extractChordLines,
  layoutChordLine,
  parseBarLine,
} from "@/lib/chords";

export type ChartViewMode =
  | "lyrics"
  | "lyrics-notation"
  | "lyrics-chords"
  | "detail";

export type ChartLineKind =
  | "empty"
  | "label"
  | "comment"
  | "notation"
  | "lyric"
  | "chords-only";

export const CHART_VIEW_MODES: readonly {
  value: ChartViewMode;
  label: string;
}[] = [
  { value: "lyrics", label: "Lirik" },
  { value: "lyrics-notation", label: "Lirik + Notasi" },
  { value: "lyrics-chords", label: "Lirik + Chord" },
  { value: "detail", label: "Detail" },
];

export const CHART_DISPLAY_MODE_KEY = "myth_chart_display_mode";

export function isChartViewMode(value: unknown): value is ChartViewMode {
  return (
    value === "lyrics" ||
    value === "lyrics-notation" ||
    value === "lyrics-chords" ||
    value === "detail"
  );
}

export function readChartViewMode(value: unknown): ChartViewMode {
  if (isChartViewMode(value)) return value;
  if (value === "chords" || value === "chord-lyric") return "lyrics-chords";
  if (value === "chord-notation") return "lyrics-notation";
  return "detail";
}

export function layersForMode(mode: ChartViewMode): {
  chords: boolean;
  notation: boolean;
  lyrics: true;
  comments: boolean;
} {
  if (mode === "lyrics") {
    return { chords: false, notation: false, lyrics: true, comments: false };
  }
  if (mode === "lyrics-notation") {
    return { chords: false, notation: true, lyrics: true, comments: false };
  }
  if (mode === "lyrics-chords") {
    return { chords: true, notation: false, lyrics: true, comments: false };
  }
  return { chords: true, notation: true, lyrics: true, comments: true };
}

export function chartComment(line: string): string | null {
  if (/[\[{]/.test(line)) return null;
  const match = /^\s*#(.*)$/.exec(line);
  if (!match) return null;
  return (match[1] ?? "").trim();
}

export function looksLikeNoteLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^[#b(){}\[\]|.'’,0-9\s/-]*$/.test(trimmed) && /\d/.test(trimmed);
}

export function classifyChartLine(line: string): ChartLineKind {
  const comment = chartComment(line);
  if (comment !== null) return "comment";

  const layout = layoutChordLine(line);
  if (layout.isEmpty) return "empty";
  if (layout.label) return "label";

  if (alignChordsToNotation(layout.chordLine, layout.lyricLine)) {
    return "notation";
  }
  if (
    notationLineError(layout.lyricLine) ||
    looksLikeNoteLine(layout.lyricLine)
  ) {
    return "notation";
  }
  if (parseBarLine(line)) return "chords-only";
  if (!layout.lyricLine.trim() && layout.chordLine.trim()) {
    return "chords-only";
  }
  return "lyric";
}

export function shouldShowChartLine(
  kind: ChartLineKind,
  mode: ChartViewMode,
): boolean {
  const layers = layersForMode(mode);
  if (kind === "empty" || kind === "label") return true;
  if (kind === "comment") return layers.comments;
  if (kind === "chords-only") return layers.chords;
  if (kind === "notation") return layers.notation || layers.chords;
  if (kind === "lyric") return layers.lyrics;
  return false;
}

export function extractVisibleChordLine(line: string): string {
  return extractChordLines(line)[0] ?? "";
}
