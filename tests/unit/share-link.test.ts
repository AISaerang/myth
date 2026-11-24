import { describe, expect, it } from "vitest";
import {
  canGuestReadSong,
  evaluateShareLink,
  shareLinkErrorMessage,
  shareLinkStatus,
  shareLinkStatusLabel,
  type ShareLinkValidityEvent,
  type ShareLinkValidityLink,
} from "@/lib/share-link";

const NOW = new Date("2026-11-24T10:00:00.000Z");

const link = (
  overrides: Partial<ShareLinkValidityLink> = {},
): ShareLinkValidityLink => ({
  expiresAt: null,
  revokedAt: null,
  maxUses: null,
  useCount: 0,
  ...overrides,
});

const event = (
  overrides: Partial<ShareLinkValidityEvent> = {},
): ShareLinkValidityEvent => ({
  eventStatus: "CONFIRMED",
  accessClosedAt: null,
  ...overrides,
});

describe("share link validity", () => {
  it("accepts a live link for an open, non-cancelled event", () => {
    expect(evaluateShareLink({ link: link(), event: event(), now: NOW })).toEqual({
      ok: true,
    });
  });

  it("never reveals an event for an unknown token", () => {
    expect(evaluateShareLink({ link: null, event: null, now: NOW })).toEqual({
      ok: false,
      reason: "unknown",
    });
    expect(shareLinkErrorMessage("unknown")).toBe("Link tidak valid.");
  });

  it("rejects revoked, expired, exhausted, cancelled and closed links", () => {
    const cases: Array<{
      name: string;
      linkValue: ShareLinkValidityLink | null;
      eventValue: ShareLinkValidityEvent | null;
      reason: string;
    }> = [
      {
        name: "revoked",
        linkValue: link({ revokedAt: new Date("2026-11-23T00:00:00.000Z") }),
        eventValue: event(),
        reason: "revoked",
      },
      {
        name: "expired",
        linkValue: link({ expiresAt: new Date("2026-11-23T00:00:00.000Z") }),
        eventValue: event(),
        reason: "expired",
      },
      {
        name: "max uses",
        linkValue: link({ maxUses: 2, useCount: 2 }),
        eventValue: event(),
        reason: "max-uses",
      },
      {
        name: "cancelled",
        linkValue: link(),
        eventValue: event({ eventStatus: "CANCELLED" }),
        reason: "cancelled",
      },
      {
        name: "closed",
        linkValue: link(),
        eventValue: event({ accessClosedAt: new Date("2026-11-24T08:00:00.000Z") }),
        reason: "closed",
      },
    ];
    for (const item of cases) {
      expect(
        evaluateShareLink({
          link: item.linkValue,
          event: item.eventValue,
          now: NOW,
        }),
      ).toEqual({ ok: false, reason: item.reason });
    }
  });

  it("keeps revoked ahead of expiry for a stable user message", () => {
    expect(
      evaluateShareLink({
        link: link({
          revokedAt: new Date("2026-11-23T00:00:00.000Z"),
          expiresAt: new Date("2026-11-20T00:00:00.000Z"),
        }),
        event: event(),
        now: NOW,
      }),
    ).toEqual({ ok: false, reason: "revoked" });
  });

  it("reports admin-facing status independently from event state", () => {
    expect(shareLinkStatus(link(), NOW)).toBe("active");
    expect(shareLinkStatus(link({ revokedAt: NOW }), NOW)).toBe("revoked");
    expect(shareLinkStatus(link({ expiresAt: NOW }), NOW)).toBe("expired");
    expect(shareLinkStatus(link({ maxUses: 1, useCount: 1 }), NOW)).toBe(
      "exhausted",
    );
    expect(shareLinkStatusLabel("exhausted")).toBe("Batas pemakaian");
  });
});

describe("guest song visibility", () => {
  it("hides archived songs even when drafts are allowed", () => {
    expect(
      canGuestReadSong({ isPublished: true, archivedAt: NOW }, true),
    ).toBe(false);
  });

  it("shows drafts only for links that explicitly include them", () => {
    const draft = { isPublished: false, archivedAt: null };
    expect(canGuestReadSong(draft, false)).toBe(false);
    expect(canGuestReadSong(draft, true)).toBe(true);
    expect(canGuestReadSong({ isPublished: true, archivedAt: null }, false)).toBe(
      true,
    );
  });
});
