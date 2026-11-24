import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  shareLinkFindUnique,
  shareLinkUpdate,
  shareLinkCreate,
  eventFindUnique,
  guestSessionFindUnique,
  guestSessionCreate,
  membershipFindUnique,
  membershipCreate,
  songAssignmentCreate,
  auditCreate,
  transaction,
} = vi.hoisted(() => ({
  shareLinkFindUnique: vi.fn(),
  shareLinkUpdate: vi.fn(),
  shareLinkCreate: vi.fn(),
  eventFindUnique: vi.fn(),
  guestSessionFindUnique: vi.fn(),
  guestSessionCreate: vi.fn(),
  membershipFindUnique: vi.fn(),
  membershipCreate: vi.fn(),
  songAssignmentCreate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shareLink: {
      findUnique: shareLinkFindUnique,
      update: shareLinkUpdate,
      create: shareLinkCreate,
    },
    event: { findUnique: eventFindUnique },
    shareGuestSession: {
      findUnique: guestSessionFindUnique,
      create: guestSessionCreate,
    },
    eventMembership: { findUnique: membershipFindUnique, create: membershipCreate },
    songAssignment: { create: songAssignmentCreate },
    auditLog: { create: auditCreate },
    $transaction: transaction,
  },
}));

import { clearLoginThrottle } from "@server/services/login-throttle";
import {
  createGuestSession,
  createShareLink,
  ensureShareLinkMembership,
  findShareLinkByToken,
  recordShareLinkUse,
  resolveShareLinkGuarded,
  shareLookupThrottleKey,
  type ResolvedShareLink,
} from "@server/services/share-link-service";

const TOKEN = "ValidShareToken_1234567890_abcdefghij";
const EVENT = {
  id: "evt_1",
  name: "Regional November",
  eventStatus: "CONFIRMED",
  accessClosedAt: null,
};

function linkRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "link_1",
    eventId: "evt_1",
    includeDrafts: false,
    expiresAt: null,
    revokedAt: null,
    maxUses: null,
    useCount: 0,
    event: EVENT,
    ...overrides,
  };
}

function resolvedLink(): ResolvedShareLink {
  return linkRow() as unknown as ResolvedShareLink;
}

describe("share link service", () => {
  beforeEach(() => {
    shareLinkFindUnique.mockReset();
    shareLinkUpdate.mockReset();
    shareLinkCreate.mockReset();
    eventFindUnique.mockReset();
    guestSessionFindUnique.mockReset();
    guestSessionCreate.mockReset();
    membershipFindUnique.mockReset();
    membershipCreate.mockReset();
    songAssignmentCreate.mockReset();
    auditCreate.mockReset();
    transaction.mockReset();
    shareLinkFindUnique.mockResolvedValue(linkRow());
    shareLinkUpdate.mockResolvedValue({ id: "link_1" });
    shareLinkCreate.mockResolvedValue({ id: "link_2" });
    eventFindUnique.mockResolvedValue({ id: "evt_1", name: EVENT.name });
    guestSessionCreate.mockResolvedValue({ id: "guest_1" });
    membershipFindUnique.mockResolvedValue(null);
    membershipCreate.mockResolvedValue({ id: "membership_1" });
    auditCreate.mockResolvedValue({ id: "audit_1" });
  });

  it("does not query the database for a malformed token", async () => {
    await expect(findShareLinkByToken("short")).resolves.toEqual({
      ok: false,
      reason: "unknown",
    });
    expect(shareLinkFindUnique).not.toHaveBeenCalled();
  });

  it("does not consume a use when resolving a landing page", async () => {
    const key = shareLookupThrottleKey("test-share-landing");
    clearLoginThrottle(key);
    await expect(
      resolveShareLinkGuarded(TOKEN, "test-share-landing"),
    ).resolves.toMatchObject({ ok: true });
    // Only an explicit guest start or logged-in resolution calls
    // recordShareLinkUse(); GET previews and chat crawlers must not burn a use.
    expect(shareLinkUpdate).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    clearLoginThrottle(key);
  });

  it("throttles repeated failed lookups and clears on success", async () => {
    const key = shareLookupThrottleKey("test-share-throttle");
    clearLoginThrottle(key);
    shareLinkFindUnique.mockResolvedValue(null);
    for (let i = 0; i < 5; i += 1) {
      await resolveShareLinkGuarded(TOKEN, "test-share-throttle");
    }
    expect(clearLoginThrottle).toBeDefined();
    const throttled = await resolveShareLinkGuarded(TOKEN, "test-share-throttle");
    expect(throttled).toEqual({ ok: false, reason: null, throttled: true });

    clearLoginThrottle(key);
    shareLinkFindUnique.mockResolvedValue(linkRow());
    await resolveShareLinkGuarded(TOKEN, "test-share-throttle");
    for (let i = 0; i < 4; i += 1) {
      shareLinkFindUnique.mockResolvedValue(null);
      await resolveShareLinkGuarded(TOKEN, "test-share-throttle");
    }
    // A successful lookup clears the bucket, so the next valid request still
    // gets through instead of hitting the 5-failure limit.
    shareLinkFindUnique.mockResolvedValue(linkRow());
    await expect(
      resolveShareLinkGuarded(TOKEN, "test-share-throttle"),
    ).resolves.toMatchObject({ ok: true });
    clearLoginThrottle(key);
  });

  it("adds an account as event MEMBER exactly once and audits the source", async () => {
    const created = await ensureShareLinkMembership("user_1", resolvedLink());
    expect(created).toEqual({ created: true });
    expect(membershipCreate).toHaveBeenCalledWith({
      data: { eventId: "evt_1", userId: "user_1", role: "MEMBER" },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "EVENT_MEMBERSHIP_ADDED",
        entityType: "Event",
        entityId: "evt_1",
        metadata: expect.objectContaining({ source: "SHARE_LINK", role: "MEMBER" }),
      }),
    });
    // Membership is the only auto-grant: no SongAssignment/Tugaskan row.
    expect(songAssignmentCreate).not.toHaveBeenCalled();

    membershipFindUnique.mockResolvedValue({ id: "membership_existing" });
    const again = await ensureShareLinkMembership("user_1", resolvedLink());
    expect(again).toEqual({ created: false });
    expect(membershipCreate).toHaveBeenCalledTimes(1);
  });

  it("increments use count only while the link is still redeemable", async () => {
    const tx = {
      shareLink: {
        findUnique: shareLinkFindUnique,
        update: shareLinkUpdate,
      },
    };
    transaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    );

    shareLinkFindUnique.mockResolvedValue({
      expiresAt: null,
      revokedAt: null,
      maxUses: 5,
      useCount: 2,
    });
    await expect(recordShareLinkUse("link_1")).resolves.toBe(true);
    expect(shareLinkUpdate).toHaveBeenCalledWith({
      where: { id: "link_1" },
      data: { useCount: { increment: 1 }, lastUsedAt: expect.any(Date) },
    });

    shareLinkUpdate.mockClear();
    shareLinkFindUnique.mockResolvedValue({
      expiresAt: null,
      revokedAt: null,
      maxUses: 2,
      useCount: 2,
    });
    await expect(recordShareLinkUse("link_1")).resolves.toBe(false);
    expect(shareLinkUpdate).not.toHaveBeenCalled();
  });

  it("never writes a raw share or guest token into audit metadata", async () => {
    const created = await createShareLink("user_1", "evt_1", {
      label: "Tamu regional",
      includeDrafts: false,
    });
    expect(created.ok).toBe(true);
    const linkAudit = auditCreate.mock.calls[0]?.[0]?.data;
    expect(linkAudit.action).toBe("SHARE_LINK_CREATED");
    expect(JSON.stringify(linkAudit.metadata)).not.toContain(
      created.ok ? created.token : "",
    );

    auditCreate.mockClear();
    const guestToken = await createGuestSession(resolvedLink(), "Sdr. Andreas");
    const guestAudit = auditCreate.mock.calls[0]?.[0]?.data;
    expect(guestAudit.action).toBe("SHARE_LINK_GUEST_STARTED");
    expect(JSON.stringify(guestAudit.metadata)).not.toContain(guestToken);
    expect(guestAudit.metadata.displayName).toBe("Sdr. Andreas");
  });
});
