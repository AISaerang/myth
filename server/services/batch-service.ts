import "server-only";
import type { BatchStatus } from "@/generated/prisma/client";
import { AuditAction, writeAudit } from "@/lib/audit";
import { canTransitionBatch } from "@/lib/batch-status";
import { prisma } from "@/lib/db";
import type { BatchInput } from "@/lib/validation/song";

export async function listBatches(eventId: string) {
  return prisma.songBatch.findMany({
    where: { eventId },
    include: {
      items: {
        include: {
          song: {
            select: {
              id: true,
              title: true,
              status: true,
              isPublished: true,
              _count: { select: { assignments: true } },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getBatch(id: string) {
  return prisma.songBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          song: {
            include: {
              activeVersion: true,
              _count: { select: { assignments: true } },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      event: { select: { id: true, name: true } },
    },
  });
}

export async function createBatch(
  actorUserId: string,
  input: BatchInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  if (input.status !== "DRAFT") {
    return { ok: false, error: "Batch baru selalu mulai dari Draft." };
  }
  const batch = await prisma.songBatch.create({
    data: {
      eventId: input.eventId,
      name: input.name,
      description: input.description || null,
      releaseAt: input.releaseAt ?? null,
      targetReviewAt: input.targetReviewAt ?? null,
      status: "DRAFT",
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.BATCH_CREATED,
    entityType: "SongBatch",
    entityId: batch.id,
    summary: `Batch "${batch.name}" dibuat.`,
    metadata: { name: batch.name },
  });
  return { ok: true, id: batch.id };
}

export async function updateBatch(
  actorUserId: string,
  id: string,
  input: Omit<BatchInput, "eventId" | "status">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.songBatch.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Batch tidak ditemukan." };
  await prisma.songBatch.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      releaseAt: input.releaseAt ?? null,
      targetReviewAt: input.targetReviewAt ?? null,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.BATCH_UPDATED,
    entityType: "SongBatch",
    entityId: id,
    summary: `Batch "${input.name}" diubah.`,
    metadata: { name: input.name },
  });
  return { ok: true };
}

export async function setBatchStatus(
  actorUserId: string,
  id: string,
  status: BatchStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.songBatch.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Batch tidak ditemukan." };
  if (!canTransitionBatch(existing.status, status)) {
    return {
      ok: false,
      error: `Transisi ${existing.status} → ${status} tidak diizinkan.`,
    };
  }
  await prisma.songBatch.update({ where: { id }, data: { status } });
  await writeAudit({
    actorUserId,
    action: AuditAction.BATCH_STATUS_CHANGED,
    entityType: "SongBatch",
    entityId: id,
    summary: `Batch "${existing.name}": ${existing.status} → ${status}.`,
    metadata: { name: existing.name, from: existing.status, to: status },
  });
  return { ok: true };
}

export async function addSongToBatch(
  batchId: string,
  songId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const batch = await prisma.songBatch.findUnique({ where: { id: batchId } });
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!batch || !song) return { ok: false, error: "Batch atau lagu tidak valid." };
  if (batch.eventId !== song.eventId) {
    return { ok: false, error: "Lagu dan batch harus satu event." };
  }
  const existing = await prisma.songBatchItem.findUnique({
    where: { songBatchId_songId: { songBatchId: batchId, songId } },
  });
  if (existing) return { ok: false, error: "Lagu sudah ada di batch ini." };
  const maxOrder = await prisma.songBatchItem.aggregate({
    where: { songBatchId: batchId },
    _max: { sortOrder: true },
  });
  await prisma.songBatchItem.create({
    data: {
      songBatchId: batchId,
      songId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return { ok: true };
}

export async function removeSongFromBatch(
  batchId: string,
  songId: string,
): Promise<void> {
  await prisma.songBatchItem
    .delete({ where: { songBatchId_songId: { songBatchId: batchId, songId } } })
    .catch(() => {});
}
