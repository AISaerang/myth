import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    songNote: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    eventSong: {
      findUnique: vi.fn(),
    },
    chartSection: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import { createSongNote, listSongNotes } from "@server/services/note-service";

const scope = {
  userId: "user_1",
  eventRole: "MEMBER" as const,
  globalAdmin: false,
  observer: false,
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "note_1",
    eventSongId: "event_song_1",
    songId: "song_1",
    sectionId: "section_1",
    sectionLabel: "Verse",
    parentId: null,
    authorUserId: "user_2",
    authorName: "Pemusik",
    partLabel: "Drum",
    targetInstrumentSkillId: null,
    targetInstrumentSkill: null,
    body: "Catatan musik",
    status: "OPEN",
    resolvedAt: null,
    resolvedByUserId: null,
    editedAt: null,
    createdAt: new Date("2026-11-06T00:00:00.000Z"),
    updatedAt: new Date("2026-11-06T00:00:00.000Z"),
    ...overrides,
  };
}

describe("listSongNotes audience filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.songNote.findMany.mockResolvedValue([]);
  });

  it("limits members to general, assigned-instrument, and their own notes", async () => {
    await listSongNotes("event_song_1", {
      ...scope,
      assignedInstrumentSkillIds: ["skill_guitar"],
    });

    expect(prisma.songNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventSongId: "event_song_1",
          OR: [
            { targetInstrumentSkillId: null },
            { targetInstrumentSkillId: { in: ["skill_guitar"] } },
            { authorUserId: "user_1" },
          ],
        },
      }),
    );
  });

  it("returns only general notes to observers", async () => {
    await listSongNotes("event_song_1", {
      ...scope,
      observer: true,
      assignedInstrumentSkillIds: ["skill_guitar"],
    });

    expect(prisma.songNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventSongId: "event_song_1",
          targetInstrumentSkillId: null,
        },
      }),
    );
  });

  it("treats event-level observers as read-only viewers of general notes", async () => {
    await listSongNotes("event_song_1", {
      ...scope,
      eventRole: "OBSERVER",
      assignedInstrumentSkillIds: ["skill_guitar"],
    });

    expect(prisma.songNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventSongId: "event_song_1",
          targetInstrumentSkillId: null,
        },
      }),
    );
  });

  it("does not grant a global observer admin audiences from event membership", async () => {
    await listSongNotes("event_song_1", {
      ...scope,
      eventRole: "EVENT_ADMIN",
      observer: true,
      assignedInstrumentSkillIds: ["skill_guitar"],
    });

    expect(prisma.songNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventSongId: "event_song_1",
          targetInstrumentSkillId: null,
        },
      }),
    );
  });

  it("allows event admins and global admins to see all note audiences", async () => {
    for (const privilegedScope of [
      { ...scope, eventRole: "EVENT_ADMIN" as const },
      { ...scope, globalAdmin: true },
    ]) {
      await listSongNotes("event_song_1", {
        ...privilegedScope,
        assignedInstrumentSkillIds: [],
      });
    }

    expect(prisma.songNote.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { eventSongId: "event_song_1" } }),
    );
    expect(prisma.songNote.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { eventSongId: "event_song_1" } }),
    );
  });

  it("groups replies under the visible parent note", async () => {
    prisma.songNote.findMany.mockResolvedValue([
      row({
        targetInstrumentSkillId: "skill_guitar",
        targetInstrumentSkill: { name: "Gitar" },
      }),
      row({
        id: "reply_1",
        parentId: "note_1",
        targetInstrumentSkillId: "skill_guitar",
        targetInstrumentSkill: { name: "Gitar" },
        authorUserId: "user_3",
      }),
    ]);

    const notes = await listSongNotes("event_song_1", {
      ...scope,
      assignedInstrumentSkillIds: ["skill_guitar"],
    });

    expect(notes).toHaveLength(1);
    expect(notes[0]?.targetInstrumentSkillName).toBe("Gitar");
    expect(notes[0]?.replies.map((reply) => reply.id)).toEqual(["reply_1"]);
  });
});

describe("createSongNote audience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.songNote.create.mockResolvedValue({ id: "created_note" });
  });

  it("accepts a target that has an assignment", async () => {
    prisma.eventSong.findUnique.mockResolvedValue({
      id: "event_song_1",
      songId: "song_1",
      assignments: [{ instrumentSkillId: "skill_drums" }],
    });
    prisma.chartSection.findUnique.mockResolvedValue({
      id: "section_1",
      songId: "song_1",
      label: "Verse",
    });

    const result = await createSongNote("user_1", "Pemusik", {
      eventSongId: "event_song_1",
      songId: "song_1",
      sectionId: "section_1",
      targetInstrumentSkillId: "skill_drums",
      body: "Catatan khusus drum",
    });

    expect(result.ok).toBe(true);
    expect(prisma.songNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetInstrumentSkillId: "skill_drums",
          sectionId: "section_1",
        }),
      }),
    );
  });

  it("rejects a target without an assignment on the event song", async () => {
    prisma.eventSong.findUnique.mockResolvedValue({
      id: "event_song_1",
      songId: "song_1",
      assignments: [{ instrumentSkillId: "skill_drums" }],
    });

    const result = await createSongNote("user_1", "Pemusik", {
      eventSongId: "event_song_1",
      songId: "song_1",
      targetInstrumentSkillId: "skill_guitar",
      body: "Catatan khusus gitar",
    });

    expect(result).toEqual({
      ok: false,
      error: "Target instrumen harus memiliki assignment pada lagu ini.",
    });
    expect(prisma.songNote.create).not.toHaveBeenCalled();
  });

  it("makes replies inherit the parent audience and section", async () => {
    prisma.eventSong.findUnique.mockResolvedValue({
      id: "event_song_1",
      songId: "song_1",
      assignments: [],
    });
    prisma.songNote.findUnique.mockResolvedValue({
      id: "parent_1",
      eventSongId: "event_song_1",
      parentId: null,
      sectionId: "section_1",
      sectionLabel: "Verse",
      targetInstrumentSkillId: "skill_drums",
    });

    const result = await createSongNote("user_1", "Pemusik", {
      eventSongId: "event_song_1",
      songId: "song_1",
      parentId: "parent_1",
      body: "Balasan",
    });

    expect(result.ok).toBe(true);
    expect(prisma.songNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: "parent_1",
          sectionId: "section_1",
          targetInstrumentSkillId: "skill_drums",
        }),
      }),
    );
  });
});
