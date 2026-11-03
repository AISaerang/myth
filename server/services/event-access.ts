import "server-only";
import type { Event, EventRole } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/permissions";
import { canAccessEvent, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function listAccessibleEvents(
  user: SessionUser,
): Promise<Event[]> {
  if (isAdmin(user)) {
    return prisma.event.findMany({
      orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    });
  }
  return prisma.event.findMany({
    where: {
      memberships: { some: { userId: user.id } },
      OR: [
        { accessClosedAt: null },
        { memberships: { some: { userId: user.id, role: "EVENT_ADMIN" } } },
      ],
    },
    orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
  });
}

export async function getAccessibleEvent(
  user: SessionUser,
  eventId: string,
): Promise<Event | null> {
  if (isAdmin(user)) {
    return prisma.event.findUnique({ where: { id: eventId } });
  }
  return prisma.event.findFirst({
    where: {
      id: eventId,
      memberships: { some: { userId: user.id } },
      OR: [
        { accessClosedAt: null },
        { memberships: { some: { userId: user.id, role: "EVENT_ADMIN" } } },
      ],
    },
  });
}

export async function getEventRole(
  user: SessionUser,
  eventId: string,
): Promise<EventRole | null> {
  if (isAdmin(user)) return "EVENT_ADMIN";
  const [membership, event] = await Promise.all([
    prisma.eventMembership.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { eventId: true, role: true },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { accessClosedAt: true },
    }),
  ]);
  if (!membership || !event) return null;
  if (
    !canAccessEvent(
      user,
      eventId,
      membership,
      event.accessClosedAt,
    )
  ) {
    return null;
  }
  return membership.role;
}
