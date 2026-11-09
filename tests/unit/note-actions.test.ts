import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireActionUser,
  requireEventMemberForEventSong,
  getEventRole,
  createSongNote,
  updateSongNote,
  deleteSongNote,
  resolveSongNote,
  writeAudit,
  revalidatePath,
  prisma,
} = vi.hoisted(() => ({
  requireActionUser: vi.fn(),
  requireEventMemberForEventSong: vi.fn(),
  getEventRole: vi.fn(),
  createSongNote: vi.fn(),
  updateSongNote: vi.fn(),
  deleteSongNote: vi.fn(),
  resolveSongNote: vi.fn(),
  writeAudit: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    event: { findUnique: vi.fn() },
    eventSong: { findUnique: vi.fn() },
    songNote: { findUnique: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth", () => ({
  requireActionUser,
  requireActionAdmin: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/audit", () => ({
  AuditAction: { NOTE_DELETED: "NOTE_DELETED" },
  writeAudit,
}));
vi.mock("@server/actions/event-authorization", () => ({
  requireEventMemberForEventSong,
}));
vi.mock("@server/services/event-access", () => ({ getEventRole }));
vi.mock("@server/services/note-service", () => ({
  createSongNote,
  updateSongNote,
  deleteSongNote,
  resolveSongNote,
}));

import {
  createSongNoteAction,
  deleteSongNoteAction,
  resolveSongNoteAction,
  updateSongNoteAction,
} from "@server/actions/notes";

const member = {
  id: "user_1",
  username: "drummer",
  displayName: "Drummer",
  role: "USER" as const,
  mustChangePassword: false,
};

const admin = {
  id: "admin_1",
  username: "md",
  displayName: "MD",
  role: "ADMIN" as const,
  mustChangePassword: false,
};

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

const createValues = {
  eventSongId: "es_1",
  songId: "song_1",
  body: "Verse: half-time groove",
};

describe("note actions", () => {
  beforeEach(() => {
    for (const mock of [
      requireActionUser,
      requireEventMemberForEventSong,
      getEventRole,
      createSongNote,
      updateSongNote,
      deleteSongNote,
      resolveSongNote,
      writeAudit,
      revalidatePath,
      prisma.event.findUnique,
      prisma.eventSong.findUnique,
      prisma.songNote.findUnique,
    ]) {
      mock.mockReset();
    }
    requireActionUser.mockResolvedValue(member);
    requireEventMemberForEventSong.mockResolvedValue({
      id: "es_1",
      eventId: "evt_1",
      songId: "song_1",
    });
    getEventRole.mockResolvedValue("MEMBER");
    prisma.event.findUnique.mockResolvedValue({ accessClosedAt: null });
    prisma.eventSong.findUnique.mockResolvedValue({ isPublished: true });
    createSongNote.mockResolvedValue({ ok: true, id: "note_1" });
    updateSongNote.mockResolvedValue({ ok: true });
    deleteSongNote.mockResolvedValue({ ok: true });
    resolveSongNote.mockResolvedValue({ ok: true });
  });

  it("creates a note as a member on a published song", async () => {
    const result = await createSongNoteAction({ ok: false }, form(createValues));

    expect(result).toEqual({ ok: true });
    expect(createSongNote).toHaveBeenCalledWith("user_1", "Drummer", {
      eventSongId: "es_1",
      songId: "song_1",
      sectionId: undefined,
      parentId: undefined,
      targetInstrumentSkillId: undefined,
      partLabel: undefined,
      body: "Verse: half-time groove",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/songs/song_1");
  });

  it("forwards section, parent, and part for a reply", async () => {
    await createSongNoteAction(
      { ok: false },
      form({
        ...createValues,
        sectionId: "sec_1",
        parentId: "note_0",
        partLabel: "Keyboard",
      }),
    );

    expect(createSongNote).toHaveBeenCalledWith(
      "user_1",
      "Drummer",
      expect.objectContaining({
        sectionId: "sec_1",
        parentId: "note_0",
        partLabel: "Keyboard",
      }),
    );
  });

  it("forwards the selected instrument audience", async () => {
    await createSongNoteAction(
      { ok: false },
      form({
        ...createValues,
        targetInstrumentSkillId: "skill_drums",
      }),
    );

    expect(createSongNote).toHaveBeenCalledWith(
      "user_1",
      "Drummer",
      expect.objectContaining({
        targetInstrumentSkillId: "skill_drums",
      }),
    );
  });

  it("refuses a member note on a draft song", async () => {
    prisma.eventSong.findUnique.mockResolvedValue({ isPublished: false });

    await expect(
      createSongNoteAction({ ok: false }, form(createValues)),
    ).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/izin/i),
    });
    expect(createSongNote).not.toHaveBeenCalled();
  });

  it("keeps an event-level observer read-only", async () => {
    getEventRole.mockResolvedValue("OBSERVER");

    await expect(
      createSongNoteAction({ ok: false }, form(createValues)),
    ).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/izin/i),
    });
    expect(createSongNote).not.toHaveBeenCalled();
  });

  it("lets an event admin add a general note on an unpublished song", async () => {
    getEventRole.mockResolvedValue("EVENT_ADMIN");
    prisma.eventSong.findUnique.mockResolvedValue({ isPublished: false });

    const result = await createSongNoteAction(
      { ok: false },
      form({ ...createValues, sectionId: "sec_verse" }),
    );

    expect(result).toEqual({ ok: true });
    expect(createSongNote).toHaveBeenCalledWith(
      "user_1",
      "Drummer",
      expect.objectContaining({
        eventSongId: "es_1",
        songId: "song_1",
        sectionId: "sec_verse",
        targetInstrumentSkillId: undefined,
        body: "Verse: half-time groove",
      }),
    );
  });

  it("refuses a note when event access is closed for an event admin", async () => {
    requireActionUser.mockResolvedValue({ ...member, role: "ADMIN" });
    // Global admin is allowed even when closed; simulate a non-admin
    // event admin by keeping USER role but EVENT_ADMIN membership.
    requireActionUser.mockResolvedValue(member);
    getEventRole.mockResolvedValue("EVENT_ADMIN");
    prisma.event.findUnique.mockResolvedValue({ accessClosedAt: new Date() });

    await expect(
      createSongNoteAction({ ok: false }, form(createValues)),
    ).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/izin/i),
    });
    expect(createSongNote).not.toHaveBeenCalled();
  });

  it("updates the author's own note", async () => {
    prisma.songNote.findUnique.mockResolvedValue({
      id: "note_1",
      eventSongId: "es_1",
      songId: "song_1",
      authorUserId: "user_1",
      parentId: null,
    });

    const result = await updateSongNoteAction(
      { ok: false },
      form({ noteId: "note_1", songId: "song_1", body: "Revisi catatan" }),
    );

    expect(result).toEqual({ ok: true });
    expect(updateSongNote).toHaveBeenCalledWith(
      "user_1",
      false,
      "note_1",
      expect.objectContaining({ songId: "song_1", body: "Revisi catatan" }),
    );
  });

  it("blocks editing another member's note", async () => {
    prisma.songNote.findUnique.mockResolvedValue({
      id: "note_1",
      eventSongId: "es_1",
      songId: "song_1",
      authorUserId: "user_2",
      parentId: null,
    });

    await expect(
      updateSongNoteAction(
        { ok: false },
        form({ noteId: "note_1", songId: "song_1", body: "Revisi catatan" }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/penulis/i),
    });
    expect(updateSongNote).not.toHaveBeenCalled();
  });

  it("allows an event admin to edit another member's note", async () => {
    getEventRole.mockResolvedValue("EVENT_ADMIN");
    prisma.songNote.findUnique.mockResolvedValue({
      id: "note_1",
      eventSongId: "es_1",
      songId: "song_1",
      authorUserId: "user_2",
      parentId: null,
    });

    const result = await updateSongNoteAction(
      { ok: false },
      form({ noteId: "note_1", songId: "song_1", body: "Revisi dari MD" }),
    );

    expect(result).toEqual({ ok: true });
    expect(updateSongNote).toHaveBeenCalledWith(
      "user_1",
      true,
      "note_1",
      expect.objectContaining({ body: "Revisi dari MD" }),
    );
  });

  it("marks a note resolved as its author", async () => {
    prisma.songNote.findUnique.mockResolvedValue({
      id: "note_1",
      eventSongId: "es_1",
      songId: "song_1",
      authorUserId: "user_1",
      parentId: null,
    });

    const result = await resolveSongNoteAction(
      { ok: false },
      form({ noteId: "note_1", songId: "song_1", resolved: "true" }),
    );

    expect(result).toEqual({ ok: true });
    expect(resolveSongNote).toHaveBeenCalledWith(
      "user_1",
      false,
      "note_1",
      true,
    );
  });

  it("audits an admin deleting another member's note", async () => {
    requireActionUser.mockResolvedValue(admin);
    requireEventMemberForEventSong.mockResolvedValue({
      id: "es_1",
      eventId: "evt_1",
      songId: "song_1",
    });
    prisma.songNote.findUnique.mockResolvedValue({
      id: "note_1",
      eventSongId: "es_1",
      songId: "song_1",
      authorUserId: "user_2",
      parentId: null,
    });

    const result = await deleteSongNoteAction(
      { ok: false },
      form({ noteId: "note_1", songId: "song_1" }),
    );

    expect(result).toEqual({ ok: true });
    expect(deleteSongNote).toHaveBeenCalledWith("admin_1", true, "note_1");
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "NOTE_DELETED",
        entityId: "note_1",
      }),
    );
  });
});
