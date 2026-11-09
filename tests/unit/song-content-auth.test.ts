import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEventRole, prisma } = vi.hoisted(() => ({
  getEventRole: vi.fn(),
  prisma: {
    event: { findUnique: vi.fn() },
    eventSong: { findUnique: vi.fn() },
    song: { findUnique: vi.fn() },
    chordChart: { findUnique: vi.fn() },
    chartSection: { findUnique: vi.fn() },
    chartArrangement: { findUnique: vi.fn() },
    arrangementVersion: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@server/services/event-access", () => ({ getEventRole }));

import { requireSongContentEditor } from "@server/actions/event-authorization";
import type { SessionUser } from "@/lib/permissions";

const eventAdmin: SessionUser = {
  id: "event-admin",
  username: "aisaerang",
  displayName: "Event Admin",
  role: "USER",
  mustChangePassword: false,
};

const member: SessionUser = {
  ...eventAdmin,
  id: "member",
  role: "USER",
};

const observer: SessionUser = {
  ...eventAdmin,
  id: "observer",
  role: "OBSERVER",
};

const admin: SessionUser = {
  ...eventAdmin,
  id: "admin",
  role: "ADMIN",
};

function linkSong(open = true) {
  prisma.eventSong.findUnique.mockResolvedValue({ id: "es-1" });
  prisma.event.findUnique.mockResolvedValue({
    accessClosedAt: open ? null : new Date("2026-11-01T00:00:00Z"),
  });
}

describe("requireSongContentEditor", () => {
  beforeEach(() => {
    getEventRole.mockReset();
    for (const model of Object.values(prisma)) {
      model.findUnique.mockReset();
    }
  });

  it("allows an EVENT_ADMIN of the song's open event and records that actor later", async () => {
    linkSong(true);
    getEventRole.mockResolvedValue("EVENT_ADMIN");

    await expect(
      requireSongContentEditor(eventAdmin, "song-1", "gehc"),
    ).resolves.toBeUndefined();
    expect(getEventRole).toHaveBeenCalledWith(eventAdmin, "gehc");
  });

  it("allows the same edit when the song is also linked to other events", async () => {
    linkSong(true);
    getEventRole.mockResolvedValue("EVENT_ADMIN");

    await expect(
      requireSongContentEditor(eventAdmin, "shared-song", "gehc"),
    ).resolves.toBeUndefined();
  });

  it("rejects an EVENT_ADMIN when the event access is closed", async () => {
    linkSong(false);
    getEventRole.mockResolvedValue("EVENT_ADMIN");

    await expect(
      requireSongContentEditor(eventAdmin, "song-1", "gehc"),
    ).rejects.toThrow("Forbidden");
  });

  it("rejects MEMBER and OBSERVER of the same event", async () => {
    linkSong(true);
    getEventRole.mockResolvedValueOnce("MEMBER").mockResolvedValueOnce("OBSERVER");

    await expect(
      requireSongContentEditor(member, "song-1", "gehc"),
    ).rejects.toThrow("Forbidden");
    await expect(
      requireSongContentEditor(observer, "song-1", "gehc"),
    ).rejects.toThrow("Forbidden");
  });

  it("rejects an EVENT_ADMIN of a different event", async () => {
    prisma.eventSong.findUnique.mockResolvedValue(null);
    prisma.event.findUnique.mockResolvedValue({ accessClosedAt: null });

    await expect(
      requireSongContentEditor(eventAdmin, "song-1", "regional"),
    ).rejects.toThrow("Not found");
    expect(getEventRole).not.toHaveBeenCalled();
  });

  it("rejects an event admin who omits eventId", async () => {
    await expect(
      requireSongContentEditor(eventAdmin, "song-1", null),
    ).rejects.toThrow("Forbidden");
    expect(prisma.song.findUnique).not.toHaveBeenCalled();
  });

  it("lets a global ADMIN edit from the library without eventId, including a closed event", async () => {
    prisma.song.findUnique.mockResolvedValue({ id: "song-1" });
    await expect(
      requireSongContentEditor(admin, "song-1", null),
    ).resolves.toBeUndefined();

    linkSong(false);
    getEventRole.mockResolvedValue("EVENT_ADMIN");
    await expect(
      requireSongContentEditor(admin, "song-1", "gehc"),
    ).resolves.toBeUndefined();
  });

  it("rejects a chart that belongs to another song", async () => {
    linkSong(true);
    getEventRole.mockResolvedValue("EVENT_ADMIN");
    prisma.chordChart.findUnique.mockResolvedValue({ songId: "other-song" });

    await expect(
      requireSongContentEditor(eventAdmin, "song-1", "gehc", {
        kind: "chordChart",
        id: "chart-other",
      }),
    ).rejects.toThrow("Not found");
  });

  it("allows a section that belongs to the authorized song", async () => {
    linkSong(true);
    getEventRole.mockResolvedValue("EVENT_ADMIN");
    prisma.chartSection.findUnique.mockResolvedValue({ songId: "song-1" });

    await expect(
      requireSongContentEditor(eventAdmin, "song-1", "gehc", {
        kind: "chartSection",
        id: "section-1",
      }),
    ).resolves.toBeUndefined();
  });
});
