import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireActionUser,
  requireEventManagerForSong,
  requireGlobalAdmin,
  addMaterialMock,
  revalidatePath,
} = vi.hoisted(() => ({
  requireActionUser: vi.fn(),
  requireEventManagerForSong: vi.fn(),
  requireGlobalAdmin: vi.fn(),
  addMaterialMock: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireActionUser,
  requireActionAdmin: vi.fn(),
}));
vi.mock("@server/actions/event-authorization", () => ({
  requireEventManagerForSong,
  requireEventManagerForEventSong: vi.fn(),
  requireEventManager: vi.fn(),
  requireMaterialManager: vi.fn(),
  requireGlobalAdmin,
}));
vi.mock("@server/services/song-service", () => ({
  addMaterial: (...args: unknown[]) => addMaterialMock(...args),
  MATERIAL_SAVE_FAILED:
    "Materi gagal disimpan. Coba lagi, atau hubungi admin bila masalah berlanjut.",
}));

import { addMaterialAction } from "@server/actions/songs";

const DRIVE_URL =
  "https://drive.google.com/file/d/19rB4-WkXeN0Au1XCsFf47Lszo1KC_B8w/view";

const admin = {
  id: "admin_1",
  username: "admin",
  displayName: "Admin",
  role: "ADMIN" as const,
  mustChangePassword: false,
};

function form(opts: { versionLabel?: string; eventId?: string } = {}) {
  const fd = new FormData();
  fd.set("songId", "song_1");
  fd.set("eventId", opts.eventId ?? "evt_gehc");
  fd.set("title", "Rekaman latihan terbaru");
  fd.set("category", "REHEARSAL_RECORDING");
  fd.set("url", DRIVE_URL);
  if (opts.versionLabel !== undefined) fd.set("versionLabel", opts.versionLabel);
  return fd;
}

describe("addMaterialAction", () => {
  beforeEach(() => {
    requireActionUser.mockReset();
    requireEventManagerForSong.mockReset();
    requireGlobalAdmin.mockReset();
    addMaterialMock.mockReset();
    revalidatePath.mockReset();
    requireActionUser.mockResolvedValue(admin);
    requireEventManagerForSong.mockResolvedValue({
      id: "es_1",
      eventId: "evt_gehc",
      songId: "song_1",
    });
    addMaterialMock.mockResolvedValue({ ok: true });
  });

  it("forwards the event-page rehearsal recording, including version v1", async () => {
    const result = await addMaterialAction({ ok: false }, form({ versionLabel: "v1" }));

    expect(result).toEqual({ ok: true });
    expect(requireEventManagerForSong).toHaveBeenCalledWith(admin, "song_1", "evt_gehc");
    expect(addMaterialMock).toHaveBeenCalledWith("admin_1", {
      songId: "song_1",
      eventId: "evt_gehc",
      title: "Rekaman latihan terbaru",
      category: "REHEARSAL_RECORDING",
      url: DRIVE_URL,
      versionLabel: "v1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/songs/song_1");
  });

  it("omits an empty version label", async () => {
    await addMaterialAction({ ok: false }, form({ versionLabel: "" }));

    expect(addMaterialMock).toHaveBeenCalledWith(
      "admin_1",
      expect.objectContaining({
        category: "REHEARSAL_RECORDING",
        versionLabel: undefined,
      }),
    );
  });

  it("returns the service error instead of throwing", async () => {
    addMaterialMock.mockResolvedValue({
      ok: false,
      error: "Materi event harus terkait lagu di setlist event tersebut.",
    });

    await expect(addMaterialAction({ ok: false }, form())).resolves.toEqual({
      ok: false,
      error: "Materi event harus terkait lagu di setlist event tersebut.",
    });
  });

  it("turns an unexpected save failure into a form error", async () => {
    addMaterialMock.mockRejectedValue(
      Object.assign(new Error("Foreign key constraint failed"), { code: "P2003" }),
    );

    await expect(addMaterialAction({ ok: false }, form({ versionLabel: "v1" }))).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/gagal disimpan/i),
    });
  });

  it("turns a forbidden event write into a form error", async () => {
    requireEventManagerForSong.mockRejectedValue(new Error("Forbidden"));

    await expect(addMaterialAction({ ok: false }, form())).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/izin/i),
    });
  });
});
