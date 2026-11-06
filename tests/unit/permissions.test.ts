import { describe, expect, it } from "vitest";
import { eventSongDisplayKey } from "@/lib/event-song";
import { uiModeForEvent } from "@/lib/ui-mode";
import {
  canManageAccounts,
  canManageEvent,
  canManageMembers,
  canAccessEvent,
  canReadDrafts,
  canWriteEventData,
  canReadEventSong,
  canModifySongNote,
  canSuggest,
  canUpdateProgress,
  canViewAllProgress,
  canWriteSongNotes,
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

  it("limits event writes and draft reads to EVENT_ADMIN membership", () => {
    expect(canManageEvent("EVENT_ADMIN")).toBe(true);
    expect(canManageMembers("EVENT_ADMIN")).toBe(true);
    expect(canReadDrafts("EVENT_ADMIN")).toBe(true);
    expect(canManageEvent("MEMBER")).toBe(false);
    expect(canManageMembers("OBSERVER")).toBe(false);
    expect(canReadDrafts(null)).toBe(false);
    expect(canWriteEventData("EVENT_ADMIN", false, false)).toBe(true);
    expect(canWriteEventData("EVENT_ADMIN", true, false)).toBe(false);
    expect(canWriteEventData("MEMBER", false, false)).toBe(false);
    expect(canWriteEventData(null, true, true)).toBe(true);
  });

  it("does not let an EVENT_ADMIN write records from another event", () => {
    const gehcAdmin: SessionUser = { ...user, id: "gehc-admin" };
    const membership = { eventId: "gehc", role: "EVENT_ADMIN" as const };
    expect(canAccessEvent(gehcAdmin, "gehc", membership)).toBe(true);
    expect(canAccessEvent(gehcAdmin, "regional", membership)).toBe(false);
    expect(canWriteEventData(null, false, false)).toBe(false);
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

  it("lets a member read every published song in their event, but not another event", () => {
    const memberRole = canAccessEvent(user, "event-a", {
      eventId: "event-a",
      role: "MEMBER",
    })
      ? ("MEMBER" as const)
      : null;
    expect(
      canReadEventSong(user, "event-a", "event-a", true, memberRole),
    ).toBe(true);
    expect(
      canReadEventSong(user, "event-b", "event-a", true, memberRole),
    ).toBe(false);
    expect(
      canReadEventSong(user, "event-a", "event-a", false, memberRole),
    ).toBe(false);
    expect(canReadEventSong(user, "event-a", "event-a", true, null)).toBe(
      false,
    );
    expect(
      canReadEventSong(admin, "event-b", "event-b", false, "EVENT_ADMIN"),
    ).toBe(
      true,
    );
    expect(
      canReadEventSong(user, "event-a", "event-a", false, "EVENT_ADMIN"),
    ).toBe(true);
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

  it("gates closing and reopening event access to the event admin", () => {
    expect(canManageEvent("EVENT_ADMIN")).toBe(true);
    expect(canManageEvent("MEMBER")).toBe(false);
    expect(canManageEvent("OBSERVER")).toBe(false);
    expect(canManageEvent(null)).toBe(false);
  });

  it("never closes access automatically when an event completes", () => {
    // COMPLETED saja tidak mengubah akses; hanya "Tutup akses" manual.
    expect(
      canAccessEvent(user, "event-a", { eventId: "event-a", role: "MEMBER" }),
    ).toBe(true);
    expect(canWriteEventData("EVENT_ADMIN", false, false)).toBe(true);
    // Setelah ditutup manual, member kehilangan akses dan EVENT_ADMIN hanya-baca.
    expect(
      canAccessEvent(user, "event-a", { eventId: "event-a", role: "MEMBER" }, new Date()),
    ).toBe(false);
    expect(canWriteEventData("EVENT_ADMIN", true, false)).toBe(false);
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

  it("keeps Edit|Preview from changing canWriteEventData", () => {
    expect(uiModeForEvent("event-a", "event-a")).toBe("preview");
    expect(uiModeForEvent(undefined, "event-a")).toBe("edit");
    const openEventAdmin = canWriteEventData("EVENT_ADMIN", false, false);
    const closedEventAdmin = canWriteEventData("EVENT_ADMIN", true, false);
    const member = canWriteEventData("MEMBER", false, false);
    expect(openEventAdmin).toBe(true);
    expect(closedEventAdmin).toBe(false);
    expect(member).toBe(false);
  });

  it("lets USER and OBSERVER suggest, ADMIN uses the full task flow", () => {
    expect(canSuggest(user)).toBe(true);
    expect(canSuggest(observer)).toBe(true);
    expect(canSuggest(admin)).toBe(false);
  });

  describe("song part notes", () => {
    it("lets members write on published songs only", () => {
      expect(canWriteSongNotes(user, "MEMBER", false, true)).toBe(true);
      expect(canWriteSongNotes(user, "MEMBER", false, false)).toBe(false);
      expect(canWriteSongNotes(user, null, false, true)).toBe(false);
    });

    it("lets event admins write drafts, but not when access is closed", () => {
      expect(canWriteSongNotes(user, "EVENT_ADMIN", false, false)).toBe(true);
      expect(canWriteSongNotes(user, "EVENT_ADMIN", true, true)).toBe(false);
    });

    it("keeps OBSERVER read-only even on published songs", () => {
      expect(canWriteSongNotes(observer, "OBSERVER", false, true)).toBe(false);
    });

    it("lets global admin write even when event access is closed", () => {
      expect(canWriteSongNotes(admin, "EVENT_ADMIN", true, false)).toBe(true);
    });

    it("lets authors and admins modify a note, but not other members", () => {
      expect(canModifySongNote(user, "user-1")).toBe(true);
      expect(canModifySongNote(user, "user-2")).toBe(false);
      expect(canModifySongNote(admin, "user-2")).toBe(true);
      expect(canModifySongNote(observer, "obs-1")).toBe(false);
    });

    it("lets event admins moderate notes within their event", () => {
      expect(canModifySongNote(user, "user-2", "EVENT_ADMIN")).toBe(true);
      expect(canModifySongNote(user, "user-2", "MEMBER")).toBe(false);
    });
  });
});
