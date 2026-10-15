import { describe, expect, it } from "vitest";
import {
  canManageAccounts,
  canSuggest,
  canUpdateProgress,
  canViewAllProgress,
  isAdmin,
  isObserver,
  roleLabel,
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
