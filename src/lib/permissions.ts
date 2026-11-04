import type { EventRole, Role } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
}

export function canManageEvent(role: EventRole | null): boolean {
  return role === "EVENT_ADMIN";
}

export function canWriteEventData(
  role: EventRole | null,
  accessClosed: boolean,
  globalAdmin: boolean,
): boolean {
  return globalAdmin || (canManageEvent(role) && !accessClosed);
}

export function canReadDrafts(role: EventRole | null): boolean {
  return role === "EVENT_ADMIN";
}

export function canManageMembers(role: EventRole | null): boolean {
  return role === "EVENT_ADMIN";
}

// Authorization checklist (docs/06): role checks live here and are
// enforced server-side on every mutation. Hiding UI is not authorization.
export function isAdmin(user: SessionUser): boolean {
  return user.role === "ADMIN";
}

export function canAccessEvent(
  user: SessionUser,
  eventId: string,
  membership: { eventId: string; role: EventRole } | null,
  accessClosedAt: Date | null = null,
): boolean {
  if (isAdmin(user)) return true;
  if (!membership || membership.eventId !== eventId) return false;
  return !accessClosedAt || membership.role === "EVENT_ADMIN";
}

export function canReadEventSong(
  user: SessionUser,
  songEventId: string,
  requestedEventId: string,
  isPublished: boolean,
  eventRole: EventRole | null,
): boolean {
  if (!eventRole || songEventId !== requestedEventId) return false;
  return isAdmin(user) || canReadDrafts(eventRole) || isPublished;
}

export function resolveAccessibleEventId(
  accessibleEventIds: readonly string[],
  requestedEventId: string | undefined,
  currentEventId: string | undefined,
): string | null {
  if (requestedEventId) {
    return accessibleEventIds.includes(requestedEventId)
      ? requestedEventId
      : null;
  }
  return currentEventId ?? accessibleEventIds[0] ?? null;
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
