import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireActionUser,
  requireActionAdmin,
  requireEventManagerForSong,
  requireSongContentEditor,
  updateSong,
  createVersion,
  archiveSong,
  saveChordChart,
  createChartSection,
  revalidatePath,
} = vi.hoisted(() => ({
  requireActionUser: vi.fn(),
  requireActionAdmin: vi.fn(),
  requireEventManagerForSong: vi.fn(),
  requireSongContentEditor: vi.fn(),
  updateSong: vi.fn(),
  createVersion: vi.fn(),
  archiveSong: vi.fn(),
  saveChordChart: vi.fn(),
  createChartSection: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireActionUser,
  requireActionAdmin,
}));
vi.mock("@server/actions/event-authorization", () => ({
  requireEventManagerForSong,
  requireEventManagerForEventSong: vi.fn(),
  requireEventManager: vi.fn(),
  requireMaterialManager: vi.fn(),
  requireGlobalAdmin: vi.fn(),
  requireSongContentEditor,
  optionalEventId: (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
}));
vi.mock("@server/services/song-service", () => ({
  updateSong,
  createVersion,
  archiveSong,
  activateVersion: vi.fn(),
  createSong: vi.fn(),
  addSongFromLibraryToEvent: vi.fn(),
  setSongPublished: vi.fn(),
  assignPerson: vi.fn(),
  bulkAssignEventSongs: vi.fn(),
  unassignPerson: vi.fn(),
  lockFinal: vi.fn(),
  unlockFinal: vi.fn(),
  addMaterial: vi.fn(),
  setMaterialActive: vi.fn(),
  deleteMaterial: vi.fn(),
  restoreSong: vi.fn(),
  MATERIAL_SAVE_FAILED: "gagal",
}));
vi.mock("@server/services/chord-service", () => ({
  saveChordChart,
  updateChordChart: vi.fn(),
  setChordChartActive: vi.fn(),
  deleteChordChart: vi.fn(),
}));
vi.mock("@server/services/chart-arrangement-service", () => ({
  createChartSection,
  updateChartSection: vi.fn(),
  deleteChartSection: vi.fn(),
  createChartArrangement: vi.fn(),
  updateChartArrangement: vi.fn(),
  deleteChartArrangement: vi.fn(),
  activateChartArrangement: vi.fn(),
  saveChartArrangementItems: vi.fn(),
  importLegacyChart: vi.fn(),
}));

import { archiveSongAction, createVersionAction, updateSongAction } from "@server/actions/songs";
import { saveChordChartAction } from "@server/actions/chords";
import { createChartSectionAction } from "@server/actions/chart-arrangements";

const eventAdmin = {
  id: "event-admin",
  username: "aisaerang",
  displayName: "Event Admin",
  role: "USER" as const,
  mustChangePassword: false,
};

function songForm() {
  const fd = new FormData();
  fd.set("songId", "song-1");
  fd.set("eventId", "gehc");
  fd.set("title", "Amazing Grace");
  fd.set("key", "D");
  fd.set("status", "DRAFT");
  fd.set("originalReferenceUrl", "https://youtu.be/example");
  fd.set("arrangementNotes", "Nada dasar D, intro not angka.");
  return fd;
}

describe("event-admin song edits", () => {
  beforeEach(() => {
    requireActionUser.mockReset();
    requireActionAdmin.mockReset();
    requireEventManagerForSong.mockReset();
    requireSongContentEditor.mockReset();
    updateSong.mockReset();
    createVersion.mockReset();
    archiveSong.mockReset();
    saveChordChart.mockReset();
    createChartSection.mockReset();
    revalidatePath.mockReset();
    requireActionUser.mockResolvedValue(eventAdmin);
    requireEventManagerForSong.mockResolvedValue({
      id: "es-1",
      eventId: "gehc",
      songId: "song-1",
    });
    requireSongContentEditor.mockResolvedValue(undefined);
    updateSong.mockResolvedValue({ ok: true });
    createVersion.mockResolvedValue({ ok: true, id: "ver-1" });
    saveChordChart.mockResolvedValue({ ok: true, id: "chart-1" });
    createChartSection.mockResolvedValue({ ok: true, id: "section-1" });
  });

  it("updates song metadata as the event admin actor", async () => {
    const result = await updateSongAction({ ok: false }, songForm());

    expect(result).toEqual({ ok: true });
    expect(requireEventManagerForSong).toHaveBeenCalledWith(
      eventAdmin,
      "song-1",
      "gehc",
    );
    expect(updateSong).toHaveBeenCalledWith(
      "event-admin",
      "song-1",
      "gehc",
      expect.objectContaining({
        title: "Amazing Grace",
        key: "D",
        originalReferenceUrl: "https://youtu.be/example",
        arrangementNotes: "Nada dasar D, intro not angka.",
      }),
    );
  });

  it("does not update the song when the event check denies the actor", async () => {
    requireEventManagerForSong.mockRejectedValue(new Error("Forbidden"));

    await expect(updateSongAction({ ok: false }, songForm())).rejects.toThrow(
      "Forbidden",
    );
    expect(updateSong).not.toHaveBeenCalled();
  });

  it("saves a chord chart for the event in context", async () => {
    const fd = new FormData();
    fd.set("songId", "song-1");
    fd.set("eventId", "gehc");
    fd.set("originalKey", "G");
    fd.set("content", "[G]Amazing [C]grace how [G]sweet");

    const result = await saveChordChartAction({ ok: false }, fd);

    expect(result).toEqual({ ok: true });
    expect(requireSongContentEditor).toHaveBeenCalledWith(
      eventAdmin,
      "song-1",
      "gehc",
    );
    expect(saveChordChart).toHaveBeenCalledWith(
      "event-admin",
      expect.objectContaining({ songId: "song-1", originalKey: "G" }),
    );
  });

  it("does not save chords when the song is outside the actor's event", async () => {
    requireSongContentEditor.mockRejectedValue(new Error("Not found"));
    const fd = new FormData();
    fd.set("songId", "song-1");
    fd.set("eventId", "regional");
    fd.set("originalKey", "G");
    fd.set("content", "[G]Amazing [C]grace how [G]sweet");

    await expect(saveChordChartAction({ ok: false }, fd)).rejects.toThrow(
      "Not found",
    );
    expect(saveChordChart).not.toHaveBeenCalled();
  });

  it("creates a chart section with the event id and the actor id", async () => {
    const fd = new FormData();
    fd.set("songId", "song-1");
    fd.set("eventId", "gehc");
    fd.set("type", "INTRO");
    fd.set("label", "Intro");
    fd.set("content", "C G\n1 2 3");

    const result = await createChartSectionAction({ ok: false }, fd);

    expect(result).toEqual({ ok: true });
    expect(requireSongContentEditor).toHaveBeenCalledWith(
      eventAdmin,
      "song-1",
      "gehc",
      undefined,
    );
    expect(createChartSection).toHaveBeenCalledWith(
      "event-admin",
      expect.objectContaining({ songId: "song-1", type: "INTRO", label: "Intro" }),
    );
  });

  it("creates an arrangement version only after the event song check", async () => {
    const fd = new FormData();
    fd.set("songId", "song-1");
    fd.set("eventId", "gehc");
    fd.set("versionLabel", "v1");
    fd.set("changeSummary", "Nada dasar dan referensi YouTube.");
    fd.set("referenceUrl", "https://youtu.be/example");

    const result = await createVersionAction({ ok: false }, fd);

    expect(result).toEqual({ ok: true });
    expect(requireSongContentEditor).toHaveBeenCalledWith(
      eventAdmin,
      "song-1",
      "gehc",
    );
    expect(createVersion).toHaveBeenCalledWith(
      "event-admin",
      expect.objectContaining({ versionLabel: "v1" }),
    );
  });

  it("keeps archive global-admin-only", async () => {
    requireActionAdmin.mockRejectedValue(new Error("Forbidden"));
    const fd = new FormData();
    fd.set("songId", "song-1");
    fd.set("eventId", "gehc");

    await expect(archiveSongAction({ ok: false }, fd)).rejects.toThrow(
      "Forbidden",
    );
    expect(archiveSong).not.toHaveBeenCalled();
    expect(requireSongContentEditor).not.toHaveBeenCalled();
  });
});
