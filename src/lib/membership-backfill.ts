// Pemilihan akun untuk backfill EventMembership.
// Murni: tidak menyentuh database. Skrip `scripts/backfill-memberships.ts`
// yang menulis. Jangan menyaring "belum ada di event regional ini" —
// akun yang sudah anggota event mana pun tidak boleh ditambahkan.

import {
  introApplyIsBlocked,
  PROD_DB_USER_PREFIX,
} from "@/lib/intro-migration";

export { PROD_DB_USER_PREFIX };

export type BackfillGlobalRole = "ADMIN" | "USER" | "OBSERVER";
export type BackfillEventRole = "EVENT_ADMIN" | "MEMBER" | "OBSERVER";
export type BackfillEventType = "REGIONAL" | "INTERNAL_GEHC";
export type BackfillEventStatus =
  | "DRAFT"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export interface BackfillUser {
  id: string;
  username: string;
  role: BackfillGlobalRole;
  isActive: boolean;
  /** Jumlah baris EventMembership di event mana pun. */
  membershipCount: number;
}

export interface BackfillEvent {
  id: string;
  name: string;
  eventType: BackfillEventType;
  eventStatus: BackfillEventStatus;
  eventDate: Date | null;
  updatedAt: Date;
}

export interface MembershipBackfillInsert {
  userId: string;
  username: string;
  globalRole: BackfillGlobalRole;
  eventRole: BackfillEventRole;
  eventId: string;
}

export interface MembershipBackfillPlan {
  /** Event REGIONAL non-CANCELLED terbaru, atau null bila tidak ada. */
  targetEvent: BackfillEvent | null;
  inserts: MembershipBackfillInsert[];
  /** Akun yang sudah punya membership (event apa pun). Tidak disentuh. */
  skippedMemberCount: number;
  /** Akun nonaktif yang belum punya membership. Tidak disentuh. */
  skippedInactiveCount: number;
  /** Akun aktif tanpa membership. Sama dengan inserts.length bila target ada. */
  unassignedActiveCount: number;
}

export function eventRoleForGlobalRole(
  role: BackfillGlobalRole,
): BackfillEventRole {
  if (role === "ADMIN") return "EVENT_ADMIN";
  if (role === "OBSERVER") return "OBSERVER";
  return "MEMBER";
}

/**
 * Sama dengan pilihan event aktif di aplikasi: REGIONAL, bukan CANCELLED,
 * eventDate menurun (tanggal kosong di belakang), lalu updatedAt menurun.
 */
export function selectCurrentRegionalEvent(
  events: readonly BackfillEvent[],
): BackfillEvent | null {
  const candidates = events.filter(
    (event) =>
      event.eventType === "REGIONAL" && event.eventStatus !== "CANCELLED",
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort(compareRegionalEventDesc)[0] ?? null;
}

function compareRegionalEventDesc(a: BackfillEvent, b: BackfillEvent): number {
  const aDate = a.eventDate?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bDate = b.eventDate?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aDate !== bDate) return bDate - aDate;
  const updated = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (updated !== 0) return updated;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function planMembershipBackfill(input: {
  users: readonly BackfillUser[];
  events: readonly BackfillEvent[];
}): MembershipBackfillPlan {
  const targetEvent = selectCurrentRegionalEvent(input.events);
  const inserts: MembershipBackfillInsert[] = [];
  let skippedMemberCount = 0;
  let skippedInactiveCount = 0;
  let unassignedActiveCount = 0;

  for (const user of input.users) {
    if (user.membershipCount > 0) {
      skippedMemberCount += 1;
      continue;
    }
    if (!user.isActive) {
      skippedInactiveCount += 1;
      continue;
    }
    unassignedActiveCount += 1;
    if (!targetEvent) continue;
    inserts.push({
      userId: user.id,
      username: user.username,
      globalRole: user.role,
      eventRole: eventRoleForGlobalRole(user.role),
      eventId: targetEvent.id,
    });
  }

  inserts.sort((a, b) => a.username.localeCompare(b.username));
  return {
    targetEvent,
    inserts,
    skippedMemberCount,
    skippedInactiveCount,
    unassignedActiveCount,
  };
}

/** Tolak --apply bila prefix user DB produksi, kecuali --allow-prod. Dry-run tetap boleh. */
export function membershipApplyIsBlocked(
  userPrefix: string,
  options: { apply: boolean; allowProd: boolean },
): boolean {
  return introApplyIsBlocked(userPrefix, options);
}
