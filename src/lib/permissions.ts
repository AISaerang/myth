import type { Role } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
}

// Authorization checklist (docs/06): role checks live here and are
// enforced server-side on every mutation. Hiding UI is not authorization.
export function isAdmin(user: SessionUser): boolean {
  return user.role === "ADMIN";
}

export function canManageAccounts(user: SessionUser): boolean {
  return user.role === "ADMIN";
}

// Practice progress ownership (used from Phase 4; defined now so the
// rule is centralized): users mutate only their own progress,
// admins may correct anyone's (audited).
export function canUpdateProgress(
  actor: SessionUser,
  targetUserId: string,
): boolean {
  return actor.id === targetUserId || actor.role === "ADMIN";
}
