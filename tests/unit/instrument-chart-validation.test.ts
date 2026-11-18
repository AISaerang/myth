import { describe, expect, it } from "vitest";
import {
  filterExistingInstrumentSections,
  instrumentChartInputSchema,
} from "@/lib/validation/instrument-chart";

const validPayload = {
  songId: "song-1",
  capo: 2,
  data: {
    sections: {
      "section-1": {
        dynamic: "mf",
        rhythm: { meter: "6/8", guitar: "D D U", piano: "quarter notes" },
      },
    },
    voicings: {
      F: {
        guitar: {
          frets: [1, 3, 3, 2, 1, 1],
          fingers: [1, 3, 4, 2, 1, 1],
          barre: { fret: 1, fromString: 0, toString: 5 },
          baseFret: 1,
        },
        piano: { lh: ["F2", "C3"], rh: ["C4", "F4", "A4"] },
      },
    },
  },
};

describe("instrument chart validation", () => {
  it("accepts bounded capo, section metadata, and instrument overrides", () => {
    expect(instrumentChartInputSchema.safeParse(validPayload).success).toBe(true);
  });

  it("ignores section metadata whose ChartSection no longer exists", () => {
    const parsed = instrumentChartInputSchema.parse(validPayload);
    expect(
      filterExistingInstrumentSections(
        parsed.data,
        new Set(["section-1"]),
      ).sections,
    ).toHaveProperty("section-1");
    expect(
      filterExistingInstrumentSections(
        parsed.data,
        new Set(["another-section"]),
      ).sections,
    ).toEqual({});
  });

  it("rejects invalid capo, dynamic, rhythm length, and diagram dimensions", () => {
    expect(
      instrumentChartInputSchema.safeParse({ ...validPayload, capo: 12 }).success,
    ).toBe(false);
    expect(
      instrumentChartInputSchema.safeParse({
        ...validPayload,
        data: {
          ...validPayload.data,
          sections: { "section-1": { dynamic: "loud" } },
        },
      }).success,
    ).toBe(false);
    expect(
      instrumentChartInputSchema.safeParse({
        ...validPayload,
        data: {
          ...validPayload.data,
          sections: {
            "section-1": { rhythm: { meter: "123456789" } },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      instrumentChartInputSchema.safeParse({
        ...validPayload,
        data: {
          ...validPayload.data,
          sections: {
            "section-1": { rhythm: { guitar: "x".repeat(81) } },
          },
        },
      }).success,
    ).toBe(false);
    expect(
      instrumentChartInputSchema.safeParse({
        ...validPayload,
        data: {
          ...validPayload.data,
          voicings: {
            F: {
              guitar: {
                ...validPayload.data.voicings.F.guitar,
                frets: [1, 2],
              },
            },
          },
        },
      }).success,
    ).toBe(false);
  });
});
