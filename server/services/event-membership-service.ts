import "server-only";
import type { EventRole } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/username";

export async function listEventMemberships(eventId: string) {
  return prisma.eventMembership.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { user: { displayName: "asc" } }],
  });
}

export async function searchAssignableUsers(
  eventId: string,
  search: string,
) {
  const query = search.trim();
  if (query.length < 2) return [];

  return prisma.user.findMany({
    where: {
      isActive: true,
      memberships: { none: { eventId } },
      OR: [
        { username: { contains: query } },
        { displayName: { contains: query } },
      ],
    },
    select: { id: true, username: true, displayName: true, role: true },
    orderBy: { displayName: "asc" },
    take: 20,
  });
}

export async function addEventMembership(
  actorUserId: string,
  eventId: string,
  username: string,
  role: EventRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(username) },
    select: { id: true, username: true, displayName: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return { ok: false, error: "Akun aktif tidak ditemukan." };
  }
  const existing = await prisma.eventMembership.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "Akun sudah menjadi anggota event ini." };
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true },
  });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };

  await prisma.eventMembership.create({
    data: { eventId, userId: user.id, role },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_MEMBERSHIP_ADDED,
    entityType: "EventMembership",
    entityId: `${eventId}:${user.id}`,
    summary: `${user.username} ditambahkan ke "${event.name}" sebagai ${role}.`,
    metadata: { eventId, username: user.username, role },
  });
  return { ok: true };
}

export async function changeEventMembershipRole(
  actorUserId: string,
  eventId: string,
  membershipId: string,
  role: EventRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result:
    | { ok: false; error: string }
    | { ok: true; changed: false }
    | {
        ok: true;
        changed: true;
        eventName: string;
        username: string;
        previousRole: EventRole;
      } = await prisma.$transaction(async (tx) => {
    const membership = await tx.eventMembership.findFirst({
      where: { id: membershipId, eventId },
      include: {
        event: { select: { name: true } },
        user: { select: { username: true } },
      },
    });
    if (!membership) return { ok: false as const, error: "Membership tidak ditemukan." };
    if (membership.role === role) return { ok: true as const, changed: false };

    if (membership.role === "EVENT_ADMIN" && role !== "EVENT_ADMIN") {
      await tx.$queryRaw`SELECT id FROM Event WHERE id = ${eventId} FOR UPDATE`;
      const eventAdmins = await tx.eventMembership.count({
        where: { eventId, role: "EVENT_ADMIN" },
      });
      if (eventAdmins <= 1) {
        return {
          ok: false as const,
          error: "Event harus memiliki minimal satu EVENT_ADMIN.",
        };
      }
    }

    await tx.eventMembership.update({
      where: { id: membershipId },
      data: { role },
    });
    return {
      ok: true as const,
      changed: true,
      eventName: membership.event.name,
      username: membership.user.username,
      previousRole: membership.role,
    };
  });
  if (result.ok === false) return result;
  if (result.changed !== true) return { ok: true };

  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_MEMBERSHIP_ROLE_CHANGED,
    entityType: "EventMembership",
    entityId: membershipId,
    summary: `Role ${result.username} di "${result.eventName}" diubah (${result.previousRole} → ${role}).`,
    metadata: {
      eventId,
      username: result.username,
      from: result.previousRole,
      to: role,
    },
  });
  return { ok: true };
}

export async function removeEventMembership(
  actorUserId: string,
  eventId: string,
  membershipId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.eventMembership.findFirst({
      where: { id: membershipId, eventId },
      include: {
        event: { select: { name: true } },
        user: { select: { username: true } },
      },
    });
    if (!membership) return { ok: false as const, error: "Membership tidak ditemukan." };

    if (membership.role === "EVENT_ADMIN") {
      await tx.$queryRaw`SELECT id FROM Event WHERE id = ${eventId} FOR UPDATE`;
      const eventAdmins = await tx.eventMembership.count({
        where: { eventId, role: "EVENT_ADMIN" },
      });
      if (eventAdmins <= 1) {
        return {
          ok: false as const,
          error: "EVENT_ADMIN terakhir tidak dapat dikeluarkan dari event.",
        };
      }
    }

    await tx.eventMembership.delete({ where: { id: membershipId } });
    return {
      ok: true as const,
      eventName: membership.event.name,
      username: membership.user.username,
      role: membership.role,
    };
  });
  if (!result.ok) return result;

  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_MEMBERSHIP_REMOVED,
    entityType: "EventMembership",
    entityId: membershipId,
    summary: `${result.username} dikeluarkan dari "${result.eventName}".`,
    metadata: {
      eventId,
      username: result.username,
      role: result.role,
    },
  });
  return { ok: true };
}
