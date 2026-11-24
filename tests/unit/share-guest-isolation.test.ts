import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ guestToken: "" as string }));
const { guestFindUnique, guestUpdate, linkFindUnique } = vi.hoisted(() => ({
  guestFindUnique: vi.fn(),
  guestUpdate: vi.fn(),
  linkFindUnique: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "myth_share_guest" && state.guestToken
        ? { name, value: state.guestToken }
        : undefined,
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shareGuestSession: { findUnique: guestFindUnique, update: guestUpdate },
    shareLink: { findUnique: linkFindUnique },
  },
}));

import { hashShareToken } from "@/lib/share-token";
import { loadGuestContext } from "../../src/app/e/[token]/tamu/guest-context";

const TOKEN_A = "ShareTokenForEventA_1234567890abc";
const TOKEN_B = "ShareTokenForEventB_1234567890abc";
const GUEST_TOKEN = "GuestSessionToken_1234567890abcdef";

const event = {
  id: "evt_a",
  name: "Event A",
  eventStatus: "CONFIRMED",
  accessClosedAt: null,
};

describe("guest session isolation", () => {
  beforeEach(() => {
    state.guestToken = GUEST_TOKEN;
    guestFindUnique.mockReset();
    guestUpdate.mockReset();
    linkFindUnique.mockReset();
    guestUpdate.mockResolvedValue({ id: "guest_1" });
    guestFindUnique.mockResolvedValue({
      id: "guest_1",
      displayName: "Tamu A",
      expiresAt: new Date(Date.now() + 60_000),
      shareLink: {
        id: "link_a",
        eventId: "evt_a",
        includeDrafts: false,
        expiresAt: null,
        revokedAt: null,
        maxUses: null,
        useCount: 1,
        event,
      },
    });
    linkFindUnique.mockImplementation(async ({ where }: { where: { tokenHash: string } }) => ({
      id: where.tokenHash === hashShareToken(TOKEN_A) ? "link_a" : "link_b",
    }));
  });

  it("opens the event bound to the guest cookie", async () => {
    const result = await loadGuestContext(TOKEN_A);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.link.event.name).toBe("Event A");
  });

  it("keeps an already-started guest valid after maxUses is reached", async () => {
    guestFindUnique.mockResolvedValue({
      id: "guest_1",
      displayName: "Tamu A",
      expiresAt: new Date(Date.now() + 60_000),
      shareLink: {
        id: "link_a",
        eventId: "evt_a",
        includeDrafts: false,
        expiresAt: null,
        revokedAt: null,
        maxUses: 1,
        useCount: 1,
        event,
      },
    });
    await expect(loadGuestContext(TOKEN_A)).resolves.toMatchObject({ ok: true });
  });

  it("rejects the same cookie on another event's share route", async () => {
    const result = await loadGuestContext(TOKEN_B);
    expect(result).toEqual({ ok: false, reason: "session" });
  });

  it("rejects a request without a guest cookie", async () => {
    state.guestToken = "";
    await expect(loadGuestContext(TOKEN_A)).resolves.toEqual({
      ok: false,
      reason: "session",
    });
    expect(guestFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an existing cookie when its link was revoked", async () => {
    guestFindUnique.mockResolvedValue({
      id: "guest_1",
      displayName: null,
      expiresAt: new Date(Date.now() + 60_000),
      shareLink: {
        id: "link_a",
        eventId: "evt_a",
        includeDrafts: false,
        expiresAt: null,
        revokedAt: new Date("2026-11-20T00:00:00.000Z"),
        maxUses: null,
        useCount: 1,
        event,
      },
    });
    await expect(loadGuestContext(TOKEN_A)).resolves.toEqual({
      ok: false,
      reason: "revoked",
    });
  });
});
