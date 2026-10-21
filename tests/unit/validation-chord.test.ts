import { describe, expect, it } from "vitest";
import {
  chordChartSchema,
  chordChartUpdateSchema,
} from "@/lib/validation/chord";

const validContent = "[C]Bapa sentuh hatiku";

describe("chordChartSchema", () => {
  it("accepts a new chart with original key", () => {
    const result = chordChartSchema.safeParse({
      songId: "song-1",
      content: validContent,
      originalKey: "G",
      label: "Versi latihan",
    });
    expect(result.success).toBe(true);
  });

  it("rejects content without a chord", () => {
    const result = chordChartSchema.safeParse({
      songId: "song-1",
      content: "Bapa sentuh hatiku",
      originalKey: "G",
    });
    expect(result.success).toBe(false);
  });
});

describe("chordChartUpdateSchema", () => {
  it("accepts editing normalized content without original key", () => {
    const result = chordChartUpdateSchema.safeParse({
      songId: "song-1",
      chartId: "chart-1",
      content: validContent,
      label: "Revisi chord",
    });
    expect(result.success).toBe(true);
  });

  it("requires chart id and valid chord content", () => {
    expect(
      chordChartUpdateSchema.safeParse({
        songId: "song-1",
        chartId: "",
        content: validContent,
      }).success,
    ).toBe(false);
    expect(
      chordChartUpdateSchema.safeParse({
        songId: "song-1",
        chartId: "chart-1",
        content: "tanpa chord",
      }).success,
    ).toBe(false);
  });

  it("rejects labels longer than 50 characters", () => {
    expect(
      chordChartUpdateSchema.safeParse({
        songId: "song-1",
        chartId: "chart-1",
        content: validContent,
        label: "x".repeat(51),
      }).success,
    ).toBe(false);
  });
});
