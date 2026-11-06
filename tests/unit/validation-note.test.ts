import { describe, expect, it } from "vitest";
import {
  songNoteResolveSchema,
  songNoteSchema,
  songNoteUpdateSchema,
} from "@/lib/validation/note";

const base = {
  eventSongId: "es_1",
  songId: "song_1",
  body: "Verse: half-time groove",
};

describe("songNoteSchema", () => {
  it("accepts a minimal top-level note and trims the body", () => {
    const parsed = songNoteSchema.safeParse({ ...base, body: "  pola drum  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.body).toBe("pola drum");
  });

  it("accepts a section anchor, reply parent, and part label", () => {
    const parsed = songNoteSchema.safeParse({
      ...base,
      sectionId: "sec_1",
      parentId: "note_1",
      partLabel: " Keyboard ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sectionId).toBe("sec_1");
      expect(parsed.data.parentId).toBe("note_1");
      expect(parsed.data.partLabel).toBe("Keyboard");
    }
  });

  it("rejects an empty or one-character body", () => {
    expect(songNoteSchema.safeParse({ ...base, body: " " }).success).toBe(false);
    expect(songNoteSchema.safeParse({ ...base, body: "a" }).success).toBe(false);
  });

  it("rejects a body longer than 2000 characters", () => {
    expect(
      songNoteSchema.safeParse({ ...base, body: "a".repeat(2001) }).success,
    ).toBe(false);
  });

  it("rejects a missing event or song", () => {
    expect(
      songNoteSchema.safeParse({ ...base, eventSongId: "" }).success,
    ).toBe(false);
    expect(songNoteSchema.safeParse({ ...base, songId: "" }).success).toBe(false);
  });

  it("rejects a part label longer than 80 characters", () => {
    expect(
      songNoteSchema.safeParse({ ...base, partLabel: "a".repeat(81) }).success,
    ).toBe(false);
  });
});

describe("songNoteUpdateSchema", () => {
  it("allows clearing the section anchor", () => {
    const parsed = songNoteUpdateSchema.safeParse({
      songId: "song_1",
      body: "catatan baru",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.sectionId).toBeUndefined();
  });

  it("requires a valid body", () => {
    expect(
      songNoteUpdateSchema.safeParse({ songId: "song_1", body: "" }).success,
    ).toBe(false);
  });
});

describe("songNoteResolveSchema", () => {
  it("only accepts boolean string values", () => {
    expect(
      songNoteResolveSchema.safeParse({ songId: "song_1", resolved: "true" })
        .success,
    ).toBe(true);
    expect(
      songNoteResolveSchema.safeParse({ songId: "song_1", resolved: "false" })
        .success,
    ).toBe(true);
    expect(
      songNoteResolveSchema.safeParse({ songId: "song_1", resolved: "yes" })
        .success,
    ).toBe(false);
  });
});
