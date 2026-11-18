import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  songFindUnique,
  eventSongFindUnique,
  versionFindUnique,
  updateMany,
  create,
  transaction,
  auditCreate,
} = vi.hoisted(() => ({
  songFindUnique: vi.fn(),
  eventSongFindUnique: vi.fn(),
  versionFindUnique: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    song: { findUnique: songFindUnique },
    eventSong: { findUnique: eventSongFindUnique },
    arrangementVersion: { findUnique: versionFindUnique },
    songMaterial: { updateMany, create },
    $transaction: transaction,
    auditLog: { create: auditCreate },
  },
}));

import { addMaterial } from "@server/services/song-service";

const DRIVE_URL =
  "https://drive.google.com/file/d/19rB4-WkXeN0Au1XCsFf47Lszo1KC_B8w/view";

const rehearsal = {
  songId: "song_1",
  title: "Rekaman latihan terbaru",
  category: "REHEARSAL_RECORDING" as const,
  url: DRIVE_URL,
};

describe("addMaterial", () => {
  beforeEach(() => {
    songFindUnique.mockReset();
    eventSongFindUnique.mockReset();
    versionFindUnique.mockReset();
    updateMany.mockReset();
    create.mockReset();
    transaction.mockReset();
    auditCreate.mockReset();

    songFindUnique.mockResolvedValue({ id: "song_1", title: "Kasih Bapa" });
    eventSongFindUnique.mockResolvedValue({ id: "es_1" });
    updateMany.mockResolvedValue({ count: 0 });
    create.mockResolvedValue({ id: "mat_1" });
    transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
    auditCreate.mockResolvedValue({ id: "audit_1" });
  });

  it("stores a library material with eventId null, not the sentinel library", async () => {
    const result = await addMaterial("admin_1", {
      ...rehearsal,
      versionLabel: "v1",
    });

    expect(result).toEqual({ ok: true });
    expect(eventSongFindUnique).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        songId: "song_1",
        category: "REHEARSAL_RECORDING",
        eventId: null,
      },
      data: { isActive: false },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        songId: "song_1",
        eventId: null,
        title: "Rekaman latihan terbaru",
        category: "REHEARSAL_RECORDING",
        url: DRIVE_URL,
        versionLabel: "v1",
        description: null,
        isActive: true,
        createdById: "admin_1",
      }),
    });
    const written = create.mock.calls[0]?.[0]?.data?.eventId;
    expect(written).not.toBe("library");
  });

  it("stores an empty version label as null", async () => {
    const result = await addMaterial("admin_1", rehearsal);

    expect(result).toEqual({ ok: true });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: null,
        versionLabel: null,
        category: "REHEARSAL_RECORDING",
      }),
    });
  });

  it("scopes an event material to that event when the song is on its setlist", async () => {
    const result = await addMaterial("admin_1", {
      ...rehearsal,
      eventId: "evt_gehc",
      versionLabel: "v1",
    });

    expect(result).toEqual({ ok: true });
    expect(eventSongFindUnique).toHaveBeenCalledWith({
      where: { eventId_songId: { eventId: "evt_gehc", songId: "song_1" } },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: "evt_gehc",
        category: "REHEARSAL_RECORDING",
        url: DRIVE_URL,
        versionLabel: "v1",
      }),
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        songId: "song_1",
        category: "REHEARSAL_RECORDING",
        eventId: "evt_gehc",
      },
      data: { isActive: false },
    });
  });

  it("rejects an event material when the song is not on that setlist", async () => {
    eventSongFindUnique.mockResolvedValue(null);

    const result = await addMaterial("admin_1", {
      ...rehearsal,
      eventId: "evt_gehc",
    });

    expect(result).toEqual({
      ok: false,
      error: "Materi event harus terkait lagu di setlist event tersebut.",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a form error when the database rejects the insert", async () => {
    transaction.mockRejectedValue(
      Object.assign(new Error("Foreign key constraint failed on the field: `eventId`"), {
        code: "P2003",
      }),
    );

    await expect(
      addMaterial("admin_1", { ...rehearsal, versionLabel: "v1" }),
    ).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/gagal disimpan/i),
    });
  });
});
