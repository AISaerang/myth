import "server-only";
import { cookies } from "next/headers";
import type { Event, EventStatus } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { ACTIVE_EVENT_COOKIE } from "@/lib/event-context";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import {
  resolveEventStatusUpdate,
  type EventInput,
} from "@/lib/validation/event";
import { getAccessibleEvent, listAccessibleEvents } from "./event-access";

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
    eventType: event.eventType,
    region: event.region,
    accessClosedAt: event.accessClosedAt,
    accessClosedById: event.accessClosedById,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export async function listEvents(user: SessionUser): Promise<Event[]> {
  return listAccessibleEvents(user);
}

export async function getEvent(
  id: string,
  user: SessionUser,
): Promise<Event | null> {
  return getAccessibleEvent(user, id);
}

// Pilih event yang diminta hanya jika dapat diakses; tanpa pilihan,
// gunakan event non-cancelled terbaru yang dapat diakses pengguna.
export async function getActiveEventFor(
  user: SessionUser,
  requestedEventId?: string,
): Promise<Event | null> {
  const events = await listAccessibleEvents(user);
  if (requestedEventId) {
    return events.find((event) => event.id === requestedEventId) ?? null;
  }
  const selectedEventId = (await cookies()).get(ACTIVE_EVENT_COOKIE)?.value;
  return (
    events.find((event) => event.id === selectedEventId) ??
    events.find((event) => event.eventStatus !== "CANCELLED") ??
    null
  );
}

export async function getCurrentEvent(user: SessionUser): Promise<Event | null> {
  return getActiveEventFor(user);
}

export async function createEvent(
  actorUserId: string,
  input: EventInput,
): Promise<Event> {
  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
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
        eventType: input.eventType ?? "REGIONAL",
        region: input.region || null,
      },
    });
    await tx.eventMembership.create({
      data: {
        eventId: created.id,
        userId: actorUserId,
        role: "EVENT_ADMIN",
      },
    });
    return created;
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_CREATED,
    entityType: "Event",
    entityId: event.id,
    summary: `Event "${event.name}" dibuat (${event.eventStatus}).`,
    metadata: {
      name: event.name,
      status: event.eventStatus,
      eventType: event.eventType,
    },
  });
  return event;
}

// Tutup/buka akses event (P7). Hanya dipanggil setelah otorisasi
// requireEventAccessManager: EVENT_ADMIN event tsb atau global ADMIN.
// Tidak otomatis dari eventStatus; MEMBERSHIP tidak berubah, tapi
// getEventRole() menolak MEMBER/OBSERVER selama tertutup (read-only
// untuk EVENT_ADMIN sampai dibuka kembali).
export async function setEventAccessClosed(
  actorUserId: string,
  eventId: string,
  closed: boolean,
): Promise<{ ok: true; changed: boolean } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  const currentlyClosed = Boolean(event.accessClosedAt);
  if (closed === currentlyClosed) return { ok: true, changed: false };

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: closed
      ? { accessClosedAt: new Date(), accessClosedById: actorUserId }
      : { accessClosedAt: null, accessClosedById: null },
  });

  await writeAudit({
    actorUserId,
    action: closed
      ? AuditAction.EVENT_ACCESS_CLOSED
      : AuditAction.EVENT_ACCESS_REOPENED,
    entityType: "Event",
    entityId: eventId,
    summary: closed
      ? `Akses "${updated.name}" ditutup.`
      : `Akses "${updated.name}" dibuka kembali.`,
    metadata: { name: updated.name, closed: closed ? "true" : "false" },
  });
  return { ok: true, changed: true };
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
  options?: { statusFieldChanged?: boolean },
): Promise<{ ok: true; event: Event } | { ok: false; error: string }> {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Event tidak ditemukan." };

  const eventStatus = resolveEventStatusUpdate(
    existing.eventStatus,
    input.eventStatus,
    options?.statusFieldChanged === true,
  );

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
      eventStatus,
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
