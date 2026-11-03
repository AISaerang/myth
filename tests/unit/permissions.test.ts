import { describe, expect, it } from "vitest";
import { eventSongDisplayKey } from "@/lib/event-song";
import {
  canManageAccounts,
  canAccessEvent,
  canSuggest,
  canUpdateProgress,
  canViewAllProgress,
  isAdmin,
  isObserver,
  roleLabel,
  resolveAccessibleEventId,
  type SessionUser,
} from "@/lib/permissions";

const admin: SessionUser = {
  id: "admin-1",
  username: "md",
  displayName: "MD",
  role: "ADMIN",
  mustChangePassword: false,
};

const user: SessionUser = {
  id: "user-1",
  username: "vokal1",
  displayName: "Vokal 1",
  role: "USER",
  mustChangePassword: false,
};

const observer: SessionUser = {
  id: "obs-1",
  username: "axcellent",
  displayName: "Axcellent",
  role: "OBSERVER",
  mustChangePassword: false,
};

describe("permissions", () => {
  it("grants account management to ADMIN only", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(user)).toBe(false);
    expect(canManageAccounts(admin)).toBe(true);
    expect(canManageAccounts(user)).toBe(false);
  });

  describe("event song display key", () => {
    it("uses the event-specific key when set", () => {
      expect(eventSongDisplayKey("D", "C")).toBe("D");
    });

    it("falls back to the library key when no event key is set", () => {
      expect(eventSongDisplayKey(null, "C")).toBe("C");
      expect(eventSongDisplayKey(null, null)).toBeNull();
    });
  });

  it("scopes event access to membership, except for global ADMIN", () => {
    const eventAMembership = { eventId: "event-a", role: "MEMBER" as const };
    expect(canAccessEvent(user, "event-a", eventAMembership)).toBe(true);
    expect(canAccessEvent(user, "event-b", eventAMembership)).toBe(false);
    expect(canAccessEvent(user, "event-a", null)).toBe(false);
    expect(canAccessEvent(admin, "event-b", null)).toBe(true);
    expect(
      resolveAccessibleEventId(["event-a"], "event-b", "event-a"),
    ).toBeNull();
    expect(
      resolveAccessibleEventId(["event-a"], "event-a", "event-a"),
    ).toBe("event-a");
  });

  it("keeps closed events visible only to event admins and global ADMIN", () => {
    const closedAt = new Date();
    expect(
      canAccessEvent(user, "event-a", { eventId: "event-a", role: "MEMBER" }, closedAt),
    ).toBe(false);
    expect(
      canAccessEvent(user, "event-a", { eventId: "event-a", role: "EVENT_ADMIN" }, closedAt),
    ).toBe(true);
    expect(canAccessEvent(admin, "event-a", null, closedAt)).toBe(true);
  });

  it("lets users update only their own progress", () => {
    expect(canUpdateProgress(user, "user-1")).toBe(true);
    expect(canUpdateProgress(user, "user-2")).toBe(false);
  });

  it("lets admins correct anyone's progress (audited)", () => {
    expect(canUpdateProgress(admin, "user-2")).toBe(true);
  });

  it("keeps OBSERVER out of admin and progress mutation", () => {
    expect(isAdmin(observer)).toBe(false);
    expect(isObserver(observer)).toBe(true);
    expect(isObserver(user)).toBe(false);
    expect(canManageAccounts(observer)).toBe(false);
    // Observer tidak update progres siapa pun, termasuk miliknya.
    expect(canUpdateProgress(observer, "obs-1")).toBe(false);
    expect(roleLabel(observer.role)).toBe("Pantau");
  });

  it("lets observers view all progress but only admins manage", () => {
    expect(canViewAllProgress(admin)).toBe(true);
    expect(canViewAllProgress(observer)).toBe(true);
    expect(canViewAllProgress(user)).toBe(false);
  });

  it("lets USER and OBSERVER suggest, ADMIN uses the full task flow", () => {
    expect(canSuggest(user)).toBe(true);
    expect(canSuggest(observer)).toBe(true);
    expect(canSuggest(admin)).toBe(false);
  });
});
