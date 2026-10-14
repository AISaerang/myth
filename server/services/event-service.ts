import "server-only";
import type { Event, EventStatus } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { EventInput } from "@/lib/validation/event";

// Contact PIC panitia hanya untuk admin: bangun objek publik eksplisit
// (allowlist) agar field restricted baru tidak bocor di masa depan.
export type PublicEvent = Omit<Event, "committeePicContact">;

export function toPublicEvent(event: Event): PublicEvent {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    venue: event.venue,
    theme: event.theme,
    targetDurationMinutes: event.targetDurationMinutes,
    eventStatus: event.eventStatus,
    liturgicalFlowUrl: event.liturgicalFlowUrl,
    committeePicName: event.committeePicName,
    notes: event.notes,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export async function listEvents(): Promise<Event[]> {
  return prisma.event.findMany({
    orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
  });
}

export async function getEvent(id: string): Promise<Event | null> {
  return prisma.event.findUnique({ where: { id } });
}

// Event berjalan: terbaru yang belum dibatalkan. Ditampilkan ke semua
// user yang login; label DRAFT/PENDING tetap terlihat agar tidak
// dikira final (docs/00).
export async function getCurrentEvent(): Promise<Event | null> {
  return prisma.event.findFirst({
    where: { eventStatus: { not: "CANCELLED" } },
    orderBy: [{ eventDate: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
  });
}

export async function createEvent(
  actorUserId: string,
  input: EventInput,
): Promise<Event> {
  const event = await prisma.event.create({
    data: {
      name: input.name,
      description: input.description || null,
      eventDate: input.eventDate ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      venue: input.venue || null,
      theme: input.theme || null,
      targetDurationMinutes: input.targetDurationMinutes,
      eventStatus: input.eventStatus as EventStatus,
      liturgicalFlowUrl: input.liturgicalFlowUrl,
      committeePicName: input.committeePicName || null,
      committeePicContact: input.committeePicContact || null,
      notes: input.notes || null,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_CREATED,
    entityType: "Event",
    entityId: event.id,
    summary: `Event "${event.name}" dibuat (${event.eventStatus}).`,
    metadata: { name: event.name, status: event.eventStatus },
  });
  return event;
}

const WATCHED_FIELDS = [
  "eventDate",
  "startTime",
  "endTime",
  "venue",
  "eventStatus",
] as const;

export async function updateEvent(
  actorUserId: string,
  id: string,
  input: EventInput,
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Event tidak ditemukan." };

  const event = await prisma.event.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      eventDate: input.eventDate ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      venue: input.venue || null,
      theme: input.theme || null,
      targetDurationMinutes: input.targetDurationMinutes,
      eventStatus: input.eventStatus as EventStatus,
      liturgicalFlowUrl: input.liturgicalFlowUrl,
      committeePicName: input.committeePicName || null,
      committeePicContact: input.committeePicContact || null,
      notes: input.notes || null,
    },
  });

  const changed = WATCHED_FIELDS.filter(
    (f) => String(existing[f] ?? "") !== String(event[f] ?? ""),
  );
  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_UPDATED,
    entityType: "Event",
    entityId: id,
    summary:
      changed.length > 0
        ? `Event "${event.name}" diubah (${changed.join(", ")}).`
        : `Event "${event.name}" diubah.`,
    metadata: { name: event.name, changed: changed.join(",") || "none" },
  });
  return { ok: true, event };
}
