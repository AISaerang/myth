import { alignChordsToNotation, notationLineError } from "@/lib/jianpu-align";
import {
  extractChordLines,
  layoutChordLine,
  parseBarLine,
} from "@/lib/chords";

export type ChartViewMode =
  | "chords"
  | "chord-lyric"
  | "chord-notation"
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
  { value: "chords", label: "Chord saja" },
  { value: "chord-lyric", label: "Chord + lirik" },
  { value: "chord-notation", label: "Chord + notasi" },
  { value: "detail", label: "Detail" },
];

export const CHART_DISPLAY_MODE_KEY = "myth_chart_display_mode";

export function isChartViewMode(value: unknown): value is ChartViewMode {
  return (
    value === "chords" ||
    value === "chord-lyric" ||
    value === "chord-notation" ||
    value === "detail"
  );
}

export function readChartViewMode(value: unknown): ChartViewMode {
  return isChartViewMode(value) ? value : "detail";
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
  if (kind === "empty" || kind === "label" || kind === "chords-only") {
    return true;
  }
  if (kind === "comment") return mode === "detail";
  if (kind === "notation") {
    return mode === "detail" || mode === "chord-notation";
  }
  if (kind === "lyric") {
    return mode === "detail" || mode === "chord-lyric";
  }
  return false;
}

export function extractVisibleChordLine(line: string): string {
  return extractChordLines(line)[0] ?? "";
}
