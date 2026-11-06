"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, writeAudit } from "@/lib/audit";
import { requireActionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canManageSongNotes,
  canModifySongNote,
  canWriteSongNotes,
} from "@/lib/permissions";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  songNoteResolveSchema,
  songNoteSchema,
  songNoteUpdateSchema,
} from "@/lib/validation/note";
import { getEventRole } from "@server/services/event-access";
import {
  createSongNote,
  deleteSongNote,
  resolveSongNote,
  updateSongNote,
} from "@server/services/note-service";
import { requireEventMemberForEventSong } from "./event-authorization";
import type { ActionState } from "./auth";

const FORBIDDEN =
  "Kamu tidak punya izin menulis catatan di lagu ini.";

async function requireNoteWriter(
  user: Awaited<ReturnType<typeof requireActionUser>>,
  eventSongId: string,
) {
  const eventSong = await requireEventMemberForEventSong(user, eventSongId);
  const [event, song, role] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventSong.eventId },
      select: { accessClosedAt: true },
    }),
    prisma.eventSong.findUnique({
      where: { id: eventSongId },
      select: { isPublished: true },
    }),
    getEventRole(user, eventSong.eventId),
  ]);
  if (
    !canWriteSongNotes(
      user,
      role,
      Boolean(event?.accessClosedAt),
      Boolean(song?.isPublished),
    )
  ) {
    throw new Error("Forbidden");
  }
  return { eventSong, role };
}

async function requireNoteActor(noteId: string) {
  const note = await prisma.songNote.findUnique({
    where: { id: noteId },
    select: {
      id: true,
      eventSongId: true,
      songId: true,
      authorUserId: true,
      parentId: true,
    },
  });
  if (!note) throw new Error("Not found");
  return note;
}

function forbiddenState(error: unknown): ActionState | null {
  if (error instanceof Error && error.message === "Forbidden") {
    return { ok: false, error: FORBIDDEN };
  }
  return null;
}

export async function createSongNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const parsed = songNoteSchema.safeParse({
    eventSongId: formData.get("eventSongId"),
    songId: formData.get("songId"),
    sectionId: formData.get("sectionId") || undefined,
    parentId: formData.get("parentId") || undefined,
    targetInstrumentSkillId:
      formData.get("targetInstrumentSkillId") || undefined,
    partLabel: formData.get("partLabel") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  try {
    const { eventSong } = await requireNoteWriter(user, parsed.data.eventSongId);
    if (eventSong.songId !== parsed.data.songId) throw new Error("Forbidden");
    const result = await createSongNote(
      user.id,
      user.displayName,
      parsed.data,
    );
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath(`/songs/${parsed.data.songId}`);
    return { ok: true };
  } catch (error) {
    const state = forbiddenState(error);
    if (state) return state;
    throw error;
  }
}

export async function updateSongNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const noteId = String(formData.get("noteId") ?? "");
  if (!noteId) return { ok: false, error: "Catatan tidak valid." };
  const parsed = songNoteUpdateSchema.safeParse({
    songId: formData.get("songId"),
    sectionId: formData.get("sectionId") || undefined,
    partLabel: formData.get("partLabel") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  try {
    const note = await requireNoteActor(noteId);
    const { role } = await requireNoteWriter(user, note.eventSongId);
    if (!canModifySongNote(user, note.authorUserId, role)) {
      return { ok: false, error: "Hanya penulis catatan yang bisa mengubahnya." };
    }
    if (note.songId !== parsed.data.songId) throw new Error("Forbidden");
    const result = await updateSongNote(
      user.id,
      canManageSongNotes(user, role),
      noteId,
      parsed.data,
    );
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath(`/songs/${parsed.data.songId}`);
    return { ok: true };
  } catch (error) {
    const state = forbiddenState(error);
    if (state) return state;
    throw error;
  }
}

export async function deleteSongNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const noteId = String(formData.get("noteId") ?? "");
  if (!noteId) return { ok: false, error: "Catatan tidak valid." };
  try {
    const note = await requireNoteActor(noteId);
    const { role } = await requireNoteWriter(user, note.eventSongId);
    if (!canModifySongNote(user, note.authorUserId, role)) {
      return { ok: false, error: "Hanya penulis catatan yang bisa menghapusnya." };
    }
    const result = await deleteSongNote(
      user.id,
      canManageSongNotes(user, role),
      noteId,
    );
    if (!result.ok) return { ok: false, error: result.error };
    if (canManageSongNotes(user, role) && note.authorUserId !== user.id) {
      await writeAudit({
        actorUserId: user.id,
        action: AuditAction.NOTE_DELETED,
        entityType: "SongNote",
        entityId: note.id,
        summary: `Catatan part dihapus oleh admin pada lagu ${note.songId}.`,
        metadata: { songId: note.songId, authorUserId: note.authorUserId },
      });
    }
    revalidatePath(`/songs/${note.songId}`);
    return { ok: true };
  } catch (error) {
    const state = forbiddenState(error);
    if (state) return state;
    throw error;
  }
}

export async function resolveSongNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const noteId = String(formData.get("noteId") ?? "");
  if (!noteId) return { ok: false, error: "Catatan tidak valid." };
  const parsed = songNoteResolveSchema.safeParse({
    songId: formData.get("songId"),
    resolved: formData.get("resolved"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  try {
    const note = await requireNoteActor(noteId);
    const { role } = await requireNoteWriter(user, note.eventSongId);
    if (!canModifySongNote(user, note.authorUserId, role)) {
      return {
        ok: false,
        error: "Hanya penulis catatan yang bisa menandai selesai.",
      };
    }
    if (note.songId !== parsed.data.songId) throw new Error("Forbidden");
    const result = await resolveSongNote(
      user.id,
      canManageSongNotes(user, role),
      noteId,
      parsed.data.resolved === "true",
    );
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath(`/songs/${parsed.data.songId}`);
    return { ok: true };
  } catch (error) {
    const state = forbiddenState(error);
    if (state) return state;
    throw error;
  }
}
