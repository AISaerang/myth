"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActionAdmin, requireActionUser } from "@/lib/auth";
import {
  requireEventManagerForEventSong,
  requireEventManagerForSong,
  requireEventManager,
  requireMaterialManager,
  requireGlobalAdmin,
  optionalEventId,
  requireSongContentEditor,
} from "./event-authorization";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  arrangementVersionSchema,
  assignmentSchema,
  bulkAssignmentSchema,
  materialSchema,
  songSchema,
  songUpdateSchema,
} from "@/lib/validation/song";
import {
  activateVersion,
  addSongFromLibraryToEvent,
  addMaterial,
  MATERIAL_SAVE_FAILED,
  archiveSong,
  assignPerson,
  bulkAssignEventSongs,
  createSong,
  createVersion,
  deleteMaterial,
  lockFinal,
  restoreSong,
  setMaterialActive,
  setSongPublished,
  unassignPerson,
  unlockFinal,
  updateSong,
} from "@server/services/song-service";
import type { ActionState } from "./auth";

function revalidateSongs(songId?: string): void {
  revalidatePath("/songs");
  revalidatePath("/batches");
  if (songId) revalidatePath(`/songs/${songId}`);
}

function parseSongForm(formData: FormData) {
  return songSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    artistOrAuthor: formData.get("artistOrAuthor") || undefined,
    liturgicalFunction: formData.get("liturgicalFunction") || undefined,
    key: formData.get("key") || undefined,
    bpm: formData.get("bpm") || undefined,
    timeSignature: formData.get("timeSignature") || undefined,
    estimatedDurationSeconds: formData.get("estimatedDurationSeconds") || undefined,
    originalReferenceUrl: formData.get("originalReferenceUrl") || undefined,
    arrangementNotes: formData.get("arrangementNotes") || undefined,
    status: formData.get("status"),
  });
}

function parseSongUpdateForm(formData: FormData) {
  return songUpdateSchema.safeParse({
    title: formData.get("title"),
    artistOrAuthor: formData.get("artistOrAuthor") || undefined,
    liturgicalFunction: formData.get("liturgicalFunction") || undefined,
    key: formData.get("key") || undefined,
    bpm: formData.get("bpm") || undefined,
    timeSignature: formData.get("timeSignature") || undefined,
    estimatedDurationSeconds: formData.get("estimatedDurationSeconds") || undefined,
    originalReferenceUrl: formData.get("originalReferenceUrl") || undefined,
    arrangementNotes: formData.get("arrangementNotes") || undefined,
    status: formData.get("status"),
  });
}

export async function createSongAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = parseSongForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createSong(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs();
  redirect(`/songs/${result.id}`);
}

export async function addSongFromLibraryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const parsed = z
    .object({
      eventId: z.string().min(1),
      songId: z.string().min(1),
    })
    .safeParse({
      eventId: formData.get("eventId"),
      songId: formData.get("songId"),
    });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  await requireEventManager(user, parsed.data.eventId);
  const result = await addSongFromLibraryToEvent(
    user.id,
    parsed.data.eventId,
    parsed.data.songId,
  );
  if (!result.ok) return result;
  revalidateSongs();
  revalidatePath(`/event/${parsed.data.eventId}`);
  return { ok: true };
}

export async function updateSongAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const id = String(formData.get("songId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!id || !eventId) return { ok: false, error: "Lagu tidak valid." };
  const parsed = parseSongUpdateForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  await requireEventManagerForSong(user, id, eventId);
  const result = await updateSong(user.id, id, eventId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(id);
  return { ok: true };
}

export async function setSongPublishedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionUser();
  const id = String(formData.get("songId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const isPublished = formData.get("isPublished") === "true";
  if (!id || !eventId) return { ok: false, error: "Lagu tidak valid." };
  await requireEventManagerForSong(admin, id, eventId);
  const result = await setSongPublished(admin.id, id, eventId, isPublished);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(id);
  return { ok: true };
}

export async function assignPersonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionUser();
  const parsed = assignmentSchema.safeParse({
    songId: formData.get("songId"),
    personId: formData.get("personId"),
    instrumentSkillId: formData.get("instrumentSkillId") || undefined,
    assignmentNote: formData.get("assignmentNote") || undefined,
    isPrimary: formData.get("isPrimary"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { ok: false, error: "Event tidak valid." };
  const eventSong = await requireEventManagerForSong(admin, parsed.data.songId, eventId);
  const result = await assignPerson(admin.id, eventSong.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(parsed.data.songId);
  return { ok: true };
}

export interface BulkAssignState extends ActionState {
  created?: number;
  skipped?: number;
  errors?: string[];
}

export async function bulkAssignSongsAction(
  _prev: BulkAssignState,
  formData: FormData,
): Promise<BulkAssignState> {
  const user = await requireActionUser();
  let payload: unknown = null;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "null"));
  } catch {
    return { ok: false, error: "Format data tidak valid." };
  }
  const parsed = bulkAssignmentSchema.safeParse({
    eventId: formData.get("eventId"),
    ...(typeof payload === "object" && payload !== null ? payload : {}),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  await requireEventManager(user, parsed.data.eventId);
  const result = await bulkAssignEventSongs(
    user.id,
    parsed.data.eventId,
    parsed.data.personIds,
    parsed.data.target,
    parsed.data.batchId,
    parsed.data.songIds,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs();
  return {
    ok: true,
    created: result.created,
    skipped: result.skipped,
    errors: result.errors,
  };
}

export async function unassignPersonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionUser();
  const songId = String(formData.get("songId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  if (!songId || !eventId || !personId) return { ok: false, error: "Data tidak valid." };
  const eventSong = await requireEventManagerForSong(admin, songId, eventId);
  const result = await unassignPerson(admin.id, eventSong.id, personId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId);
  return { ok: true };
}

export async function createVersionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const parsed = arrangementVersionSchema.safeParse({
    songId: formData.get("songId"),
    versionLabel: formData.get("versionLabel"),
    changeSummary: formData.get("changeSummary"),
    key: formData.get("key") || undefined,
    bpm: formData.get("bpm") || undefined,
    grooveNotes: formData.get("grooveNotes") || undefined,
    structureNotes: formData.get("structureNotes") || undefined,
    referenceUrl: formData.get("referenceUrl") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  await requireSongContentEditor(
    user,
    parsed.data.songId,
    optionalEventId(formData.get("eventId")),
  );
  const result = await createVersion(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(parsed.data.songId);
  return { ok: true };
}

export async function activateVersionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const versionId = String(formData.get("versionId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!versionId || !songId) return { ok: false, error: "Versi tidak valid." };
  await requireSongContentEditor(
    user,
    songId,
    optionalEventId(formData.get("eventId")),
    { kind: "arrangementVersion", id: versionId },
  );
  const result = await activateVersion(user.id, versionId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId || undefined);
  return { ok: true };
}

export async function lockFinalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionUser();
  const versionId = String(formData.get("versionId") ?? "");
  const eventSongId = String(formData.get("eventSongId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!versionId || !eventSongId) return { ok: false, error: "Versi tidak valid." };
  const eventSong = await requireEventManagerForEventSong(admin, eventSongId);
  const result = await lockFinal(admin.id, eventSong.id, versionId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId || undefined);
  return { ok: true };
}

export async function unlockFinalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionUser();
  const eventSongId = String(formData.get("eventSongId") ?? "");
  if (!eventSongId) return { ok: false, error: "Lagu tidak valid." };
  const eventSong = await requireEventManagerForEventSong(admin, eventSongId);
  const result = await unlockFinal(admin.id, eventSong.id);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(eventSong.songId);
  return { ok: true };
}

function materialActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") {
    return "Sesi berakhir. Masuk lagi untuk menambah materi.";
  }
  if (message === "Forbidden") {
    return "Anda tidak punya izin menambah materi ini.";
  }
  if (message === "Not found") {
    return "Lagu atau event tidak ditemukan.";
  }
  return MATERIAL_SAVE_FAILED;
}

export async function addMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const admin = await requireActionUser();
    const parsed = materialSchema.safeParse({
      songId: formData.get("songId"),
      eventId: formData.get("eventId") || undefined,
      arrangementVersionId: formData.get("arrangementVersionId") || undefined,
      title: formData.get("title"),
      category: formData.get("category"),
      url: formData.get("url"),
      versionLabel: formData.get("versionLabel") || undefined,
      description: formData.get("description") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: firstIssueMessage(parsed.error) };
    }
    if (parsed.data.eventId) {
      await requireEventManagerForSong(
        admin,
        parsed.data.songId,
        parsed.data.eventId,
      );
    } else {
      await requireGlobalAdmin(admin);
    }
    const result = await addMaterial(admin.id, parsed.data);
    if (!result.ok) return { ok: false, error: result.error };
    revalidateSongs(parsed.data.songId);
    return { ok: true };
  } catch (error) {
    console.error("add-material-action-failed", error);
    return { ok: false, error: materialActionError(error) };
  }
}

export async function setMaterialActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionUser();
  const materialId = String(formData.get("materialId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!materialId) return { ok: false, error: "Materi tidak valid." };
  await requireMaterialManager(
    admin,
    materialId,
    optionalEventId(formData.get("eventId")),
  );
  const result = await setMaterialActive(admin.id, materialId, isActive);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId || undefined);
  return { ok: true };
}

export async function deleteMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionUser();
  const materialId = String(formData.get("materialId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!materialId) return { ok: false, error: "Materi tidak valid." };
  await requireMaterialManager(
    admin,
    materialId,
    optionalEventId(formData.get("eventId")),
  );
  const result = await deleteMaterial(materialId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId || undefined);
  return { ok: true };
}

export async function archiveSongAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const songId = String(formData.get("songId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!songId || !eventId) return { ok: false, error: "Lagu tidak valid." };
  const result = await archiveSong(admin.id, songId, eventId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId);
  return { ok: true };
}

export async function restoreSongAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const songId = String(formData.get("songId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!songId || !eventId) return { ok: false, error: "Lagu tidak valid." };
  const result = await restoreSong(admin.id, songId, eventId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId);
  return { ok: true };
}
