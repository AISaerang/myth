import { describe, expect, it } from "vitest";
import {
  canManageAccounts,
  canUpdateProgress,
  isAdmin,
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
});
