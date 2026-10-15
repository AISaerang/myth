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

// OBSERVER ("Pantau" di UI): memantau semua progres lagu Publish +
// memberi usulan via task; tidak boleh mutasi musikal/akun.
export function isObserver(user: SessionUser): boolean {
  return user.role === "OBSERVER";
}

// Label ramah untuk badge/nav (ADMIN/USER tetap apa adanya).
export function roleLabel(role: SessionUser["role"]): string {
  return role === "OBSERVER" ? "Pantau" : role;
}

// Siapa boleh melihat progres semua personel (read-only).
// ADMIN: semua termasuk DRAFT. OBSERVER: semua tapi Publish saja
// (filter Publish ditegakkan di service, bukan di sini).
export function canViewAllProgress(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "OBSERVER";
}

// Siapa boleh membuat usulan (task TODO tanpa PIC, dimoderasi MD).
// Pemusik (USER) dan pemantau (OBSERVER) boleh usul; ADMIN lewat
// jalur task penuh.
export function canSuggest(user: SessionUser): boolean {
  return user.role === "USER" || user.role === "OBSERVER";
}

export function canManageAccounts(user: SessionUser): boolean {
  return user.role === "ADMIN";
}

// Practice progress ownership (used from Phase 4; defined now so the
// rule is centralized): users mutate only their own progress,
// admins may correct anyone's (audited). OBSERVER never mutates
// progress (pemantau + pengusul saja).
export function canUpdateProgress(
  actor: SessionUser,
  targetUserId: string,
): boolean {
  if (actor.role === "OBSERVER") return false;
  return actor.id === targetUserId || actor.role === "ADMIN";
}
