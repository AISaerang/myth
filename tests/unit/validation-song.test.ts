import { describe, expect, it } from "vitest";
import { BATCH_STATUS_LABEL, canTransitionBatch } from "@/lib/batch-status";
import {
  compareSongStatus,
  isTerminalSongStatus,
  SONG_STATUS_LABEL,
  SONG_STATUS_ORDER,
  songStatusTone,
} from "@/lib/song-status";
import {
  arrangementVersionSchema,
  assignmentSchema,
  batchSchema,
  materialSchema,
  songSchema,
} from "@/lib/validation/song";

describe("song status pipeline", () => {
  it("covers all 9 spec statuses in order", () => {
    expect(SONG_STATUS_ORDER).toHaveLength(9);
    expect(SONG_STATUS_ORDER[0]).toBe("DRAFT");
    expect(SONG_STATUS_ORDER[8]).toBe("FINAL_LOCKED");
    for (const s of SONG_STATUS_ORDER) {
      expect(SONG_STATUS_LABEL[s]).toBeTruthy();
      expect(songStatusTone(s)).toBeTruthy();
    }
  });

  it("treats only FINAL_LOCKED as terminal", () => {
    expect(isTerminalSongStatus("FINAL_LOCKED")).toBe(true);
    expect(isTerminalSongStatus("REHEARSAL_READY")).toBe(false);
    expect(compareSongStatus("DRAFT", "PRACTICING")).toBeLessThan(0);
    expect(compareSongStatus("READY_FOR_REHEARSAL", "NEEDS_REVIEW")).toBeGreaterThan(0);
  });
});

describe("song validation", () => {
  const base = { eventId: "e1", title: "Hari Terbaik", status: "DRAFT" };

  it("accepts a minimal song", () => {
    expect(songSchema.safeParse(base).success).toBe(true);
  });

  it("rejects invalid BPM, key, time signature, duration", () => {
    expect(songSchema.safeParse({ ...base, bpm: "20" }).success).toBe(false);
    expect(songSchema.safeParse({ ...base, bpm: "400" }).success).toBe(false);
    expect(songSchema.safeParse({ ...base, bpm: "92" }).success).toBe(true);
    expect(songSchema.safeParse({ ...base, key: "Z9" }).success).toBe(false);
    expect(songSchema.safeParse({ ...base, key: "F#m" }).success).toBe(true);
    expect(songSchema.safeParse({ ...base, timeSignature: "bebas" }).success).toBe(false);
    expect(
      songSchema.safeParse({ ...base, estimatedDurationSeconds: "-10" }).success,
    ).toBe(false);
  });
});

describe("batch status transitions", () => {
  it("allows the publish → review → complete lifecycle", () => {
    expect(canTransitionBatch("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransitionBatch("PUBLISHED", "REVIEWING")).toBe(true);
    expect(canTransitionBatch("REVIEWING", "COMPLETED")).toBe(true);
    expect(BATCH_STATUS_LABEL.PUBLISHED).toBe("Dipublikasi");
  });

  it("blocks skipping stages and edits out of completed", () => {
    expect(canTransitionBatch("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransitionBatch("COMPLETED", "PUBLISHED")).toBe(false);
    expect(canTransitionBatch("ARCHIVED", "DRAFT")).toBe(true);
  });
});
describe("batch / assignment / version / material validation", () => {
  it("validates batches", () => {
    expect(
      batchSchema.safeParse({ eventId: "e1", name: "Batch 1", status: "DRAFT" }).success,
    ).toBe(true);
    expect(
      batchSchema.safeParse({ eventId: "e1", name: "B", status: "DRAFT" }).success,
    ).toBe(false);
  });

  it("requires song and person for assignments", () => {
    expect(assignmentSchema.safeParse({ songId: "s1" }).success).toBe(false);
    expect(
      assignmentSchema.safeParse({ songId: "s1", personId: "p1" }).success,
    ).toBe(true);
  });

  it("requires label and summary for versions", () => {
    expect(
      arrangementVersionSchema.safeParse({ songId: "s1", versionLabel: "v01" }).success,
    ).toBe(false);
    const ok = arrangementVersionSchema.safeParse({
      songId: "s1",
      versionLabel: "v01",
      changeSummary: "Referensi awal dari YouTube",
      key: "D",
      bpm: "92",
    });
    expect(ok.success).toBe(true);
  });

  it("requires http(s) material urls", () => {
    expect(
      materialSchema.safeParse({
        songId: "s1",
        title: "Ref",
        category: "ORIGINAL",
        url: "www.contoh.com/x",
      }).success,
    ).toBe(false);
    expect(
      materialSchema.safeParse({
        songId: "s1",
        title: "Ref",
        category: "ORIGINAL",
        url: "https://www.youtube.com/watch?v=x",
      }).success,
    ).toBe(true);
  });
});
