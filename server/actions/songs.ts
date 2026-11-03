"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionAdmin, requireActionUser } from "@/lib/auth";
import {
  requireEventManagerForEventSong,
  requireEventManagerForSong,
  requireMaterialManager,
  requireGlobalAdmin,
} from "./event-authorization";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  arrangementVersionSchema,
  assignmentSchema,
  materialSchema,
  songSchema,
  songUpdateSchema,
} from "@/lib/validation/song";
import {
  activateVersion,
  addMaterial,
  assignPerson,
  createSong,
  createVersion,
  deleteMaterial,
  lockFinal,
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

export async function updateSongAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("songId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!id || !eventId) return { ok: false, error: "Lagu tidak valid." };
  const parsed = parseSongUpdateForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await updateSong(admin.id, id, eventId, parsed.data);
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
  const admin = await requireActionAdmin();
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
  const result = await createVersion(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(parsed.data.songId);
  return { ok: true };
}

export async function activateVersionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const versionId = String(formData.get("versionId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!versionId) return { ok: false, error: "Versi tidak valid." };
  const result = await activateVersion(admin.id, versionId);
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

export async function addMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
  await requireMaterialManager(admin, materialId);
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
  await requireMaterialManager(admin, materialId);
  const result = await deleteMaterial(materialId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSongs(songId || undefined);
  return { ok: true };
}
