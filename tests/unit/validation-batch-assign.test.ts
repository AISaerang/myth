import { describe, expect, it } from "vitest";
import { batchAssignmentSchema } from "@/lib/validation/song";

const base = {
  batchId: "batch-1",
  rows: [
    { personId: "person-1", instrumentSkillId: "skill-drum" },
    { personId: "person-2" },
  ],
  songIds: ["song-1", "song-2"],
};

describe("batchAssignmentSchema", () => {
  it("accepts multiple personnel with own parts", () => {
    expect(batchAssignmentSchema.safeParse(base).success).toBe(true);
  });

  it("rejects duplicate personnel in one submit", () => {
    expect(
      batchAssignmentSchema.safeParse({
        ...base,
        rows: [{ personId: "person-1" }, { personId: "person-1" }],
      }).success,
    ).toBe(false);
  });

  it("rejects empty rows, empty songs, and missing batch", () => {
    expect(
      batchAssignmentSchema.safeParse({ ...base, rows: [] }).success,
    ).toBe(false);
    expect(
      batchAssignmentSchema.safeParse({ ...base, songIds: [] }).success,
    ).toBe(false);
    expect(
      batchAssignmentSchema.safeParse({ ...base, batchId: "" }).success,
    ).toBe(false);
  });
});
