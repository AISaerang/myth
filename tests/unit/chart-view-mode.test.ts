import { describe, expect, it } from "vitest";
import {
  CHART_DISPLAY_MODE_KEY,
  classifyChartLine,
  extractVisibleChordLine,
  layersForMode,
  readChartViewMode,
  shouldShowChartLine,
} from "@/lib/chart-view-mode";

describe("chart view mode", () => {
  it("defaults to detail and ignores legacy values", () => {
    expect(readChartViewMode(null)).toBe("detail");
    expect(readChartViewMode("both")).toBe("detail");
    expect(readChartViewMode("unknown")).toBe("detail");
    expect(readChartViewMode("chords")).toBe("lyrics-chords");
    expect(readChartViewMode("chord-lyric")).toBe("lyrics-chords");
    expect(readChartViewMode("chord-notation")).toBe("lyrics-notation");
    expect(readChartViewMode("lyrics")).toBe("lyrics");
    expect(readChartViewMode("lyrics-notation")).toBe("lyrics-notation");
    expect(readChartViewMode("lyrics-chords")).toBe("lyrics-chords");
    expect(readChartViewMode("detail")).toBe("detail");
    expect(CHART_DISPLAY_MODE_KEY).toBe("myth_chart_display_mode");
  });

  it("maps each mode to its chart layers", () => {
    expect(layersForMode("lyrics")).toEqual({ chords: false, notation: false, lyrics: true, comments: false });
    expect(layersForMode("lyrics-notation")).toEqual({ chords: false, notation: true, lyrics: true, comments: false });
    expect(layersForMode("lyrics-chords")).toEqual({ chords: true, notation: false, lyrics: true, comments: false });
    expect(layersForMode("detail")).toEqual({ chords: true, notation: true, lyrics: true, comments: true });
  });

  it("classifies labels, comments, notation, lyrics, chords, and empty lines", () => {
    expect(classifyChartLine("{Intro}")).toBe("label");
    expect(classifyChartLine("# catatan")).toBe("comment");
    expect(classifyChartLine("[C]Kami [G]puji")).toBe("lyric");
    expect(classifyChartLine("[C]1 2 3 |")).toBe("notation");
    expect(classifyChartLine("[Csus4]")).toBe("chords-only");
    expect(classifyChartLine("| . . . . |")).toBe("chords-only");
    expect(classifyChartLine("C   .   G")).toBe("chords-only");
    expect(classifyChartLine("(pickup ½ bar)  F |")).toBe("chords-only");
    expect(classifyChartLine("[C]5- / [5 6] .5")).toBe("notation");
    expect(classifyChartLine("|")).toBe("lyric");
    expect(classifyChartLine("")).toBe("empty");
  });

  it("applies mixed-line visibility rules", () => {
    expect(shouldShowChartLine("comment", "detail")).toBe(true);
    expect(shouldShowChartLine("comment", "lyrics-chords")).toBe(false);
    expect(shouldShowChartLine("notation", "lyrics-notation")).toBe(true);
    expect(shouldShowChartLine("notation", "lyrics-chords")).toBe(true);
    expect(shouldShowChartLine("lyric", "lyrics-chords")).toBe(true);
    expect(shouldShowChartLine("lyric", "lyrics-notation")).toBe(true);
    expect(shouldShowChartLine("label", "lyrics")).toBe(true);
  });

  it("extracts only chord text from a lyric line", () => {
    expect(extractVisibleChordLine("[C]Kami [G]puji")).toBe("C  G");
  });
});
