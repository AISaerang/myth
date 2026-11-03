import "server-only";
import type { PracticeStatus } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { ProgressInput } from "@/lib/validation/work";

export async function getMyProgress(
  userId: string,
  eventSongId: string,
) {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) return null;
  return prisma.practiceProgress.findFirst({
    where: { eventSongId, personId: person.id },
  });
}

export async function getSongProgress(eventSongId: string) {
  return prisma.practiceProgress.findMany({
    where: { eventSongId },
    include: { person: { select: { id: true, displayName: true, isActive: true } } },
    orderBy: { person: { displayName: "asc" } },
  });
}

// Personel memperbarui progresnya sendiri (docs/01: user hanya
// mengubah progres sendiri). Harus ditugaskan di lagu itu.
// OBSERVER tidak boleh update progres (pemantau + pengusul saja).
export async function upsertMyProgress(
  userId: string,
  eventSongId: string,
  input: Omit<ProgressInput, "songId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [user, person, eventSong] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.person.findUnique({ where: { userId } }),
    prisma.eventSong.findUnique({
      where: { id: eventSongId },
      select: { id: true, songId: true },
    }),
  ]);
  if (user?.role === "OBSERVER") {
    return { ok: false, error: "Akun pemantau tidak bisa update progres latihan." };
  }
  if (!person || !person.isActive) {
    return { ok: false, error: "Profil personel tidak aktif." };
  }
  if (!eventSong) return { ok: false, error: "Lagu event tidak ditemukan." };
  const assignment = await prisma.songAssignment.findUnique({
    where: { songId_personId: { songId: eventSong.songId, personId: person.id } },
    select: { eventSongId: true },
  });
  if (!assignment || assignment.eventSongId !== eventSongId) {
    return { ok: false, error: "Lagu ini tidak ditugaskan kepadamu." };
  }
  const existing = await prisma.practiceProgress.findUnique({
    where: {
      songId_personId: { songId: eventSong.songId, personId: person.id },
    },
    select: { eventSongId: true },
  });
  if (existing?.eventSongId && existing.eventSongId !== eventSongId) {
    return { ok: false, error: "Progres lagu pustaka ini sudah terhubung ke event lain." };
  }
  await prisma.practiceProgress.upsert({
    where: {
      songId_personId: { songId: eventSong.songId, personId: person.id },
    },
    create: {
      songId: eventSong.songId,
      personId: person.id,
      eventSongId,
      status: input.status as PracticeStatus,
      note: input.note || null,
      updatedById: userId,
    },
    update: {
      eventSongId,
      status: input.status as PracticeStatus,
      note: input.note || null,
      updatedById: userId,
    },
  });
  return { ok: true };
}

// Koreksi admin atas progres siapa pun — tercatat di audit (docs/06).
export async function correctProgress(
  actorUserId: string,
  eventSongId: string,
  personId: string,
  input: Omit<ProgressInput, "songId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return { ok: false, error: "Personel tidak ditemukan." };
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: eventSongId },
    include: { song: { select: { id: true, title: true } } },
  });
  if (!eventSong) return { ok: false, error: "Lagu event tidak ditemukan." };
  const existing = await prisma.practiceProgress.findUnique({
    where: {
      songId_personId: { songId: eventSong.songId, personId },
    },
    select: { eventSongId: true },
  });
  if (existing?.eventSongId && existing.eventSongId !== eventSongId) {
    return { ok: false, error: "Progres lagu pustaka ini sudah terhubung ke event lain." };
  }
  await prisma.practiceProgress.upsert({
    where: {
      songId_personId: { songId: eventSong.songId, personId },
    },
    create: {
      songId: eventSong.songId,
      personId,
      eventSongId,
      status: input.status as PracticeStatus,
      note: input.note || null,
      updatedById: actorUserId,
    },
    update: {
      eventSongId,
      status: input.status as PracticeStatus,
      note: input.note || null,
      updatedById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.PROGRESS_CORRECTED,
    entityType: "Song",
    entityId: eventSong.songId,
    summary: `Progres ${person.displayName} di "${eventSong.song.title}" dikoreksi menjadi ${input.status}.`,
    metadata: { song: eventSong.song.title, person: person.displayName, status: input.status, eventId: eventSong.eventId },
  });
  return { ok: true };
}
