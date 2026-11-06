import "server-only";
import { prisma } from "@/lib/db";
import type { SongNoteView } from "@/lib/song-note";
import type {
  SongNoteInput,
  SongNoteUpdateInput,
} from "@/lib/validation/note";

type Result =
  | { ok: true; id: string }
  | { ok: false; error: string };

type SimpleResult = { ok: true } | { ok: false; error: string };

// Satu query per lagu-event; balasan dikelompokkan di memori. Volume
// catatan per lagu kecil, jadi tidak perlu query rekursif.
export async function listSongNotes(
  eventSongId: string,
): Promise<SongNoteView[]> {
  const rows = await prisma.songNote.findMany({
    where: { eventSongId },
    orderBy: { createdAt: "asc" },
  });
  const byId = new Map<string, SongNoteView>();
  const roots: SongNoteView[] = [];
  for (const row of rows) {
    byId.set(row.id, { ...row, replies: [] });
  }
  for (const row of rows) {
    const view = byId.get(row.id);
    if (!view) continue;
    if (row.parentId) {
      const parent = byId.get(row.parentId);
      if (parent) parent.replies.push(view);
      else roots.push(view);
    } else {
      roots.push(view);
    }
  }
  // Terbaru di atas untuk catatan induk; balasan tetap kronologis.
  roots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return roots;
}

export async function countOpenNotesBySectionLabel(
  eventSongId: string,
): Promise<Record<string, number>> {
  const rows = await prisma.songNote.findMany({
    where: { eventSongId, status: "OPEN", parentId: null, sectionLabel: { not: null } },
    select: { sectionLabel: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const label = row.sectionLabel?.trim();
    if (!label) continue;
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

export async function createSongNote(
  authorUserId: string,
  authorName: string,
  input: SongNoteInput,
): Promise<Result> {
  const eventSong = await prisma.eventSong.findUnique({
    where: { id: input.eventSongId },
    select: { id: true, songId: true },
  });
  if (!eventSong || eventSong.songId !== input.songId) {
    return { ok: false, error: "Lagu event tidak ditemukan." };
  }

  let parent:
    | { id: string; eventSongId: string; parentId: string | null; sectionId: string | null; sectionLabel: string | null }
    | null = null;
  if (input.parentId) {
    parent = await prisma.songNote.findUnique({
      where: { id: input.parentId },
      select: {
        id: true,
        eventSongId: true,
        parentId: true,
        sectionId: true,
        sectionLabel: true,
      },
    });
    if (!parent || parent.eventSongId !== input.eventSongId) {
      return { ok: false, error: "Catatan induk tidak ditemukan." };
    }
    if (parent.parentId) {
      return { ok: false, error: "Balasan hanya satu tingkat." };
    }
  }

  let sectionId: string | null = parent?.sectionId ?? null;
  let sectionLabel: string | null = parent?.sectionLabel ?? null;
  if (!parent && input.sectionId) {
    const section = await prisma.chartSection.findUnique({
      where: { id: input.sectionId },
      select: { id: true, songId: true, label: true },
    });
    if (!section || section.songId !== eventSong.songId) {
      return { ok: false, error: "Bagian lagu tidak ditemukan." };
    }
    sectionId = section.id;
    sectionLabel = section.label;
  }

  const note = await prisma.songNote.create({
    data: {
      eventSongId: eventSong.id,
      songId: eventSong.songId,
      sectionId,
      sectionLabel,
      parentId: parent?.id ?? null,
      authorUserId,
      authorName,
      partLabel: input.partLabel || null,
      body: input.body,
    },
    select: { id: true },
  });
  return { ok: true, id: note.id };
}

export async function updateSongNote(
  actorUserId: string,
  isAdmin: boolean,
  noteId: string,
  input: SongNoteUpdateInput,
): Promise<SimpleResult> {
  const note = await prisma.songNote.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      songId: true,
      authorUserId: true,
      parentId: true,
    },
  });
  if (!note || note.songId !== input.songId) {
    return { ok: false, error: "Catatan tidak ditemukan." };
  }
  if (!isAdmin && note.authorUserId !== actorUserId) {
    return { ok: false, error: "Hanya penulis catatan yang bisa mengubahnya." };
  }

  let sectionId: string | null | undefined;
  let sectionLabel: string | null | undefined;
  // Balasan mengikuti bagian induknya; jangan pindahkan jangkar sendiri.
  if (!note.parentId) {
    if (input.sectionId) {
      const section = await prisma.chartSection.findUnique({
        where: { id: input.sectionId },
        select: { id: true, songId: true, label: true },
      });
      if (!section || section.songId !== note.songId) {
        return { ok: false, error: "Bagian lagu tidak ditemukan." };
      }
      sectionId = section.id;
      sectionLabel = section.label;
    } else {
      sectionId = null;
      sectionLabel = null;
    }
  }

  await prisma.songNote.update({
    where: { id: note.id },
    data: {
      body: input.body,
      partLabel: input.partLabel || null,
      ...(sectionId !== undefined ? { sectionId, sectionLabel } : {}),
      editedAt: new Date(),
    },
  });
  return { ok: true };
}

export async function deleteSongNote(
  actorUserId: string,
  isAdmin: boolean,
  noteId: string,
): Promise<SimpleResult> {
  const note = await prisma.songNote.findUnique({
    where: { id: noteId },
    select: { id: true, authorUserId: true },
  });
  if (!note) return { ok: false, error: "Catatan tidak ditemukan." };
  if (!isAdmin && note.authorUserId !== actorUserId) {
    return { ok: false, error: "Hanya penulis catatan yang bisa menghapusnya." };
  }
  await prisma.songNote.delete({ where: { id: note.id } });
  return { ok: true };
}

export async function resolveSongNote(
  actorUserId: string,
  isAdmin: boolean,
  noteId: string,
  resolved: boolean,
): Promise<SimpleResult> {
  const note = await prisma.songNote.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      authorUserId: true,
      parentId: true,
      status: true,
      body: true,
    },
  });
  if (!note) return { ok: false, error: "Catatan tidak ditemukan." };
  if (note.parentId) {
    return { ok: false, error: "Tandai selesai pada catatan utama, bukan balasan." };
  }
  if (!isAdmin && note.authorUserId !== actorUserId) {
    return { ok: false, error: "Hanya penulis catatan yang bisa menandai selesai." };
  }
  if ((note.status === "RESOLVED") === resolved) return { ok: true };

  await prisma.songNote.update({
    where: { id: note.id },
    data: resolved
      ? {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedByUserId: actorUserId,
        }
      : {
          status: "OPEN",
          resolvedAt: null,
          resolvedByUserId: null,
        },
  });
  return { ok: true };
}
