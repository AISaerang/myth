import { describe, expect, it } from "vitest";
import {
  CHART_DISPLAY_MODE_KEY,
  classifyChartLine,
  extractVisibleChordLine,
  readChartViewMode,
  shouldShowChartLine,
} from "@/lib/chart-view-mode";

describe("chart view mode", () => {
  it("defaults to detail and ignores legacy values", () => {
    expect(readChartViewMode(null)).toBe("detail");
    expect(readChartViewMode("both")).toBe("detail");
    expect(readChartViewMode("lyrics")).toBe("detail");
    expect(readChartViewMode("chord-lyric")).toBe("chord-lyric");
    expect(CHART_DISPLAY_MODE_KEY).toBe("myth_chart_display_mode");
  });

  it("classifies labels, comments, notation, lyrics, chords, and empty lines", () => {
    expect(classifyChartLine("{Intro}")).toBe("label");
    expect(classifyChartLine("# catatan")).toBe("comment");
    expect(classifyChartLine("[C]Kami [G]puji")).toBe("lyric");
    expect(classifyChartLine("[C]1 2 3 |")).toBe("notation");
    expect(classifyChartLine("[Csus4]")).toBe("chords-only");
    expect(classifyChartLine("| . . . . |")).toBe("chords-only");
    expect(classifyChartLine("C   .   G")).toBe("chords-only");
    expect(classifyChartLine("[C]5- / [5 6] .5")).toBe("notation");
    expect(classifyChartLine("|")).toBe("lyric");
    expect(classifyChartLine("")).toBe("empty");
  });

  it("applies mixed-line visibility rules", () => {
    expect(shouldShowChartLine("comment", "detail")).toBe(true);
    expect(shouldShowChartLine("comment", "chord-lyric")).toBe(false);
    expect(shouldShowChartLine("notation", "chord-notation")).toBe(true);
    expect(shouldShowChartLine("notation", "chord-lyric")).toBe(false);
    expect(shouldShowChartLine("lyric", "chord-lyric")).toBe(true);
    expect(shouldShowChartLine("lyric", "chord-notation")).toBe(false);
    expect(shouldShowChartLine("label", "chords")).toBe(true);
  });

  it("extracts only chord text from a lyric line", () => {
    expect(extractVisibleChordLine("[C]Kami [G]puji")).toBe("C  G");
  });
});
