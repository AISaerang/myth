import "server-only";
import type { DecisionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { DecisionInput } from "@/lib/validation/operations";

// Decision log is append-only: decisions are records, corrected by
// adding a new entry — never edited silently.
export async function listDecisions(eventId: string) {
  return prisma.decisionLog.findMany({
    where: { eventId },
    include: {
      relatedSong: { select: { id: true, title: true } },
      relatedRehearsal: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDecision(
  actorUserId: string,
  input: DecisionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event tidak ditemukan." };
  if (input.relatedSongId) {
    const song = await prisma.song.findUnique({
      where: { id: input.relatedSongId },
    });
    if (!song || song.eventId !== input.eventId) {
      return { ok: false, error: "Lagu terkait harus satu event." };
    }
  }
  if (input.relatedRehearsalId) {
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: input.relatedRehearsalId },
    });
    if (!rehearsal || rehearsal.eventId !== input.eventId) {
      return { ok: false, error: "Rehearsal terkait harus satu event." };
    }
  }
  await prisma.decisionLog.create({
    data: {
      eventId: input.eventId,
      title: input.title,
      decisionType: input.decisionType as DecisionType,
      decisionText: input.decisionText,
      reason: input.reason || null,
      decidedBy: input.decidedBy || null,
      relatedSongId: input.relatedSongId,
      relatedRehearsalId: input.relatedRehearsalId,
      createdById: actorUserId,
    },
  });
  return { ok: true };
}
