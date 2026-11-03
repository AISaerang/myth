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
  const rehearsals = await prisma.rehearsal.findMany({
    where: {
      eventId,
      status: { in: ["SCHEDULED", "RESCHEDULED"] },
      startsAt: { gte: now },
    },
    include: {
      songs: {
        where: {
          OR: [
            { eventSong: { is: { eventId, isPublished: true } } },
            {
              eventSongId: null,
              song: { is: { eventId, isPublished: true } },
            },
          ],
        },
        include: {
          song: { select: { id: true, title: true, eventId: true } },
          eventSong: {
            select: {
              eventId: true,
              isPublished: true,
              song: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { startsAt: "asc" },
    take: 5,
  });
  return rehearsals.map((rehearsal) => ({
    ...rehearsal,
    songs: rehearsal.songs.map((item) => {
      if (
        (item.eventSong &&
          (item.eventSong.eventId !== rehearsal.eventId ||
            !item.eventSong.isPublished)) ||
        (!item.eventSong && item.song.eventId !== rehearsal.eventId)
      ) {
        throw new Error(
          `Rehearsal song ${item.songId} is missing its EventSong.`,
        );
      }
      return { ...item, song: item.eventSong?.song ?? item.song };
    }),
  }));
}

export async function getRehearsal(id: string) {
  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id },
    include: {
      songs: {
        include: {
          song: {
            select: {
              id: true,
              title: true,
              eventId: true,
              status: true,
              isPublished: true,
            },
          },
          eventSong: {
            select: {
              eventId: true,
              status: true,
              isPublished: true,
              song: { select: { id: true, title: true } },
            },
          },
        },
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
  if (!rehearsal) return null;
  return {
    ...rehearsal,
    songs: rehearsal.songs.map((item) => {
      if (
        (item.eventSong && item.eventSong.eventId !== rehearsal.eventId) ||
        (!item.eventSong && item.song.eventId !== rehearsal.eventId)
      ) {
        throw new Error(
          `Rehearsal song ${item.songId} is missing its EventSong.`,
        );
      }
      return {
        ...item,
        song: {
          ...(item.eventSong?.song ?? item.song),
          status: item.eventSong?.status ?? item.song.status,
          isPublished:
            item.eventSong?.isPublished ?? item.song.isPublished,
        },
      };
    }),
  };
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
    const eventSongs = await prisma.eventSong.findMany({
      where: { eventId: rehearsal.eventId, songId: { in: songIds } },
      select: { id: true, songId: true },
    });
    if (eventSongs.length !== songIds.length) {
      return { ok: false, error: "Semua lagu harus ada di setlist event rehearsal." };
    }
    const eventSongIdBySongId = new Map(eventSongs.map((item) => [item.songId, item.id]));
    await prisma.$transaction([
      prisma.rehearsalSong.deleteMany({ where: { rehearsalId } }),
      prisma.rehearsalSong.createMany({
        data: songIds.map((songId, i) => ({
          rehearsalId,
          songId,
          eventSongId: eventSongIdBySongId.get(songId)!,
          sortOrder: i,
        })),
        skipDuplicates: true,
      }),
    ]);
    return { ok: true };
  }
  await prisma.$transaction([
    prisma.rehearsalSong.deleteMany({ where: { rehearsalId } }),
  ]);
  return { ok: true };
}

// Susun ulang urutan lagu dalam rehearsal (penting untuk full
// rehearsal urutan liturgi). Daftar id harus persis berisi lagu sesi.
export async function reorderRehearsalSongs(
  rehearsalId: string,
  orderedSongIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rehearsal = await prisma.rehearsal.findUnique({
    where: { id: rehearsalId },
    include: { songs: { select: { songId: true } } },
  });
  if (!rehearsal) return { ok: false, error: "Rehearsal tidak ditemukan." };
  const current = new Set(rehearsal.songs.map((s) => s.songId));
  if (
    orderedSongIds.length !== current.size ||
    !orderedSongIds.every((id) => current.has(id))
  ) {
    return { ok: false, error: "Daftar urutan tidak cocok dengan isi sesi." };
  }
  await prisma.$transaction(
    orderedSongIds.map((songId, index) =>
      prisma.rehearsalSong.update({
        where: { rehearsalId_songId: { rehearsalId, songId } },
        data: { sortOrder: index },
      }),
    ),
  );
  return { ok: true };
}

export async function upsertAttendance(  input: AttendanceInput,
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
