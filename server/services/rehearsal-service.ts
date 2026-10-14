import "server-only";
import type {
  AttendanceStatus,
  RehearsalStatus,
  RehearsalType,
} from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type {
  AttendanceInput,
  RehearsalInput,
} from "@/lib/validation/operations";

export async function listRehearsals(eventId: string) {
  return prisma.rehearsal.findMany({
    where: { eventId },
    include: {
      _count: { select: { songs: true, attendance: true } },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function listUpcomingRehearsals(eventId: string, now: Date = new Date()) {
  return prisma.rehearsal.findMany({
    where: {
      eventId,
      status: { in: ["SCHEDULED", "RESCHEDULED"] },
      startsAt: { gte: now },
    },
    include: {
      songs: { include: { song: { select: { id: true, title: true } } }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { startsAt: "asc" },
    take: 5,
  });
}

export async function getRehearsal(id: string) {
  return prisma.rehearsal.findUnique({
    where: { id },
    include: {
      songs: {
        include: { song: { select: { id: true, title: true, status: true } } },
        orderBy: { sortOrder: "asc" },
      },
      attendance: {
        include: { person: { select: { id: true, displayName: true, isActive: true } } },
        orderBy: { person: { displayName: "asc" } },
      },
      tasks: {
        include: { assignee: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      },
      event: { select: { id: true, name: true } },
    },
  });
}

export async function createRehearsal(
  actorUserId: string,
  input: RehearsalInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  const rehearsal = await prisma.rehearsal.create({
    data: {
      eventId: input.eventId,
      title: input.title,
      type: input.type as RehearsalType,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      venueOrMeetingUrl: input.venueOrMeetingUrl || null,
      agenda: input.agenda || null,
      status: input.status as RehearsalStatus,
      notes: input.notes || null,
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.REHEARSAL_CREATED,
    entityType: "Rehearsal",
    entityId: rehearsal.id,
    summary: `Rehearsal "${rehearsal.title}" dijadwalkan.`,
    metadata: { title: rehearsal.title, type: rehearsal.type },
  });
  return { ok: true, id: rehearsal.id };
}

export async function updateRehearsal(
  actorUserId: string,
  id: string,
  input: Omit<RehearsalInput, "eventId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.rehearsal.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Rehearsal tidak ditemukan." };
  await prisma.rehearsal.update({
    where: { id },
    data: {
      title: input.title,
      type: input.type as RehearsalType,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      venueOrMeetingUrl: input.venueOrMeetingUrl || null,
      agenda: input.agenda || null,
      status: input.status as RehearsalStatus,
      notes: input.notes || null,
    },
  });
  const action =
    input.status === "CANCELLED" && existing.status !== "CANCELLED"
      ? AuditAction.REHEARSAL_CANCELLED
      : AuditAction.REHEARSAL_UPDATED;
  await writeAudit({
    actorUserId,
    action,
    entityType: "Rehearsal",
    entityId: id,
    summary:
      action === AuditAction.REHEARSAL_CANCELLED
        ? `Rehearsal "${input.title}" dibatalkan.`
        : `Rehearsal "${input.title}" diubah (${existing.status} → ${input.status}).`,
    metadata: { title: input.title, from: existing.status, to: input.status },
  });
  return { ok: true };
}

export async function setRehearsalSongs(
  rehearsalId: string,
  songIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
  });
  if (!rehearsal) return { ok: false, error: "Rehearsal tidak ditemukan." };
  if (songIds.length > 0) {
    const count = await prisma.song.count({
      where: { id: { in: songIds }, eventId: rehearsal.eventId },
    });
    if (count !== songIds.length) {
      return { ok: false, error: "Semua lagu harus satu event dengan rehearsal." };
    }
  }
  await prisma.$transaction([
    prisma.rehearsalSong.deleteMany({ where: { rehearsalId } }),
    prisma.rehearsalSong.createMany({
      data: songIds.map((songId, i) => ({ rehearsalId, songId, sortOrder: i })),
      skipDuplicates: true,
    }),
  ]);
  return { ok: true };
}

export async function upsertAttendance(
  input: AttendanceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: input.rehearsalId },
  });
  if (!rehearsal) return { ok: false, error: "Rehearsal tidak ditemukan." };
  const person = await prisma.person.findUnique({
    where: { id: input.personId },
  });
  if (!person || !person.isActive) {
    return { ok: false, error: "Personel tidak aktif." };
  }
  await prisma.rehearsalAttendance.upsert({
    where: {
      rehearsalId_personId: {
        rehearsalId: input.rehearsalId,
        personId: input.personId,
      },
    },
    create: {
      rehearsalId: input.rehearsalId,
      personId: input.personId,
      status: input.status as AttendanceStatus,
      note: input.note || null,
    },
    update: {
      status: input.status as AttendanceStatus,
      note: input.note || null,
    },
  });
  return { ok: true };
}
