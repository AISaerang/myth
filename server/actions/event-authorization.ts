import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import { canWriteEventData, isAdmin } from "@/lib/permissions";
import { getEventRole } from "@server/services/event-access";

type EventScopedEntity =
  | "batch"
  | "equipment"
  | "rehearsal"
  | "task";

export async function requireEventMember(
  user: SessionUser,
  eventId: string,
): Promise<void> {
  if (!(await getEventRole(user, eventId))) throw new Error("Forbidden");
}

export async function requireEventManager(
  user: SessionUser,
  eventId: string,
): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, accessClosedAt: true },
  });
  if (!event) throw new Error("Not found");

  const role = await getEventRole(user, event.id);
  if (!canWriteEventData(role, Boolean(event.accessClosedAt), isAdmin(user))) {
    throw new Error("Forbidden");
  }
}

export async function requireEventManagerForEntity(
  user: SessionUser,
  entity: EventScopedEntity,
  id: string,
): Promise<string> {
  const record =
    entity === "batch"
      ? await prisma.songBatch.findUnique({
          where: { id },
          select: { eventId: true },
        })
      : entity === "equipment"
        ? await prisma.equipmentItem.findUnique({
            where: { id },
            select: { eventId: true },
          })
        : entity === "rehearsal"
          ? await prisma.rehearsal.findUnique({
              where: { id },
              select: { eventId: true },
            })
          : await prisma.task.findUnique({
              where: { id },
              select: { eventId: true },
            });
  if (!record) throw new Error("Not found");
  await requireEventManager(user, record.eventId);
  return record.eventId;
}

export async function requireEventMemberForTask(
  user: SessionUser,
  taskId: string,
): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { eventId: true },
  });
  if (!task) throw new Error("Not found");
  await requireEventMember(user, task.eventId);
  return task.eventId;
}

export async function requireEventManagerForEventSong(
  user: SessionUser,
  eventSongId: string,
): Promise<{ id: string; eventId: string; songId: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    select: { id: true, eventId: true, songId: true },
  });
  if (!eventSong) throw new Error("Not found");
  await requireEventManager(user, eventSong.eventId);
  return eventSong;
}

export async function requireEventMemberForEventSong(
  user: SessionUser,
  eventSongId: string,
): Promise<{ id: string; eventId: string; songId: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    select: { id: true, eventId: true, songId: true },
  });
  if (!eventSong) throw new Error("Not found");
  await requireEventMember(user, eventSong.eventId);
  return eventSong;
}

export async function requireEventManagerForSong(
  user: SessionUser,
  songId: string,
  eventId: string,
): Promise<{ id: string; eventId: string; songId: string }> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId, songId } },
    select: { id: true, eventId: true, songId: true },
  });
  if (!eventSong) throw new Error("Not found");
  await requireEventManager(user, eventSong.eventId);
  return eventSong;
}

export async function requireGlobalAdmin(user: SessionUser): Promise<void> {
  if (!isAdmin(user)) throw new Error("Forbidden");
}

export async function requireMaterialManager(
  user: SessionUser,
  materialId: string,
): Promise<void> {
  const material = await prisma.songMaterial.findUnique({
    where: { id: materialId },
    select: { eventId: true },
  });
  if (!material) throw new Error("Not found");
  if (!material.eventId) {
    await requireGlobalAdmin(user);
    return;
  }
  await requireEventManager(user, material.eventId);
}
