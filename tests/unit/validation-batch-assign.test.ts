import { describe, expect, it } from "vitest";
import { planBulkAssignments } from "@/lib/bulk-assign";
import { batchAssignmentSchema, bulkAssignmentSchema } from "@/lib/validation/song";

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

  it("accepts every song in the event without a song list", () => {
    expect(
      bulkAssignmentSchema.safeParse({
        eventId: "event-1",
        personIds: ["person-1", "person-2"],
        target: "EVENT",
      }).success,
    ).toBe(true);
  });

  it("requires a batch id or at least one song for those targets", () => {
    expect(
      bulkAssignmentSchema.safeParse({
        eventId: "event-1",
        personIds: ["person-1"],
        target: "BATCH",
      }).success,
    ).toBe(false);
    expect(
      bulkAssignmentSchema.safeParse({
        eventId: "event-1",
        personIds: ["person-1"],
        target: "SONGS",
        songIds: [],
      }).success,
    ).toBe(false);
    expect(
      bulkAssignmentSchema.safeParse({
        eventId: "event-1",
        personIds: ["person-1", "person-1"],
        target: "EVENT",
      }).success,
    ).toBe(false);
  });

  it("skips existing pairs and reports cross-event conflicts", () => {
    const plan = planBulkAssignments(
      [
        {
          personId: "person-1",
          displayName: "Vokal",
          activeMember: true,
          instrumentSkillId: "skill-vocal",
        },
        {
          personId: "outsider",
          displayName: "Bukan anggota",
          activeMember: false,
          instrumentSkillId: null,
        },
      ],
      [
        { songId: "song-1", eventSongId: "es-1", title: "Satu" },
        { songId: "song-2", eventSongId: "es-2", title: "Dua" },
      ],
      [
        { songId: "song-1", personId: "person-1", eventSongId: "es-1" },
        { songId: "song-2", personId: "person-1", eventSongId: "other-event" },
      ],
    );
    expect(plan.created).toBe(0);
    expect(plan.skipped).toBe(1);
    expect(plan.toCreate).toEqual([]);
    expect(plan.errors).toEqual([
      'Vokal sudah ditugaskan ke "Dua" di event lain.',
      "Bukan anggota bukan pemusik/penyanyi anggota event ini.",
    ]);
  });

  it("creates one assignment per new person and song, with the default skill", () => {
    const plan = planBulkAssignments(
      [
        {
          personId: "person-1",
          displayName: "Keyboard",
          activeMember: true,
          instrumentSkillId: "skill-keys",
        },
      ],
      [
        { songId: "song-1", eventSongId: "es-1", title: "Satu" },
        { songId: "song-2", eventSongId: "es-2", title: "Dua" },
      ],
      [],
    );
    expect(plan.created).toBe(2);
    expect(plan.skipped).toBe(0);
    expect(plan.errors).toEqual([]);
    expect(plan.toCreate.map((row) => row.instrumentSkillId)).toEqual([
      "skill-keys",
      "skill-keys",
    ]);
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
