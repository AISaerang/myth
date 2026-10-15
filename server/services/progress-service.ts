import "server-only";
import type { PracticeStatus } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type { ProgressInput } from "@/lib/validation/work";

export async function getMyProgress(
  userId: string,
  songId: string,
) {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) return null;
  return prisma.practiceProgress.findUnique({
    where: { songId_personId: { songId, personId: person.id } },
  });
}

export async function getSongProgress(songId: string) {
  return prisma.practiceProgress.findMany({
    where: { songId },
    include: { person: { select: { id: true, displayName: true, isActive: true } } },
    orderBy: { person: { displayName: "asc" } },
  });
}

// Personel memperbarui progresnya sendiri (docs/01: user hanya
// mengubah progres sendiri). Harus ditugaskan di lagu itu.
// OBSERVER tidak boleh update progres (pemantau + pengusul saja).
export async function upsertMyProgress(
  userId: string,
  input: ProgressInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [user, person] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.person.findUnique({ where: { userId } }),
  ]);
  if (user?.role === "OBSERVER") {
    return { ok: false, error: "Akun pemantau tidak bisa update progres latihan." };
  }
  if (!person || !person.isActive) {
    return { ok: false, error: "Profil personel tidak aktif." };
  }
  const assignment = await prisma.songAssignment.findUnique({
    where: { songId_personId: { songId: input.songId, personId: person.id } },
  });
  if (!assignment) {
    return { ok: false, error: "Lagu ini tidak ditugaskan kepadamu." };
  }
  await prisma.practiceProgress.upsert({
    where: { songId_personId: { songId: input.songId, personId: person.id } },
    create: {
      songId: input.songId,
      personId: person.id,
      status: input.status as PracticeStatus,
      note: input.note || null,
      updatedById: userId,
    },
    update: {
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
  songId: string,
  personId: string,
  input: Omit<ProgressInput, "songId">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return { ok: false, error: "Personel tidak ditemukan." };
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { id: true, title: true },
  });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
  await prisma.practiceProgress.upsert({
    where: { songId_personId: { songId, personId } },
    create: {
      songId,
      personId,
      status: input.status as PracticeStatus,
      note: input.note || null,
      updatedById: actorUserId,
    },
    update: {
      status: input.status as PracticeStatus,
      note: input.note || null,
      updatedById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.PROGRESS_CORRECTED,
    entityType: "Song",
    entityId: songId,
    summary: `Progres ${person.displayName} di "${song.title}" dikoreksi menjadi ${input.status}.`,
    metadata: { song: song.title, person: person.displayName, status: input.status },
  });
  return { ok: true };
}
