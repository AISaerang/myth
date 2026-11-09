"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/permissions";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  chartArrangementActivateSchema,
  chartArrangementCreateSchema,
  chartArrangementDeleteSchema,
  chartArrangementItemsSchema,
  chartArrangementUpdateSchema,
  chartSectionCreateSchema,
  chartSectionDeleteSchema,
  chartSectionUpdateSchema,
  legacyChartImportSchema,
} from "@/lib/validation/chart-arrangement";
import {
  activateChartArrangement,
  createChartArrangement,
  createChartSection,
  deleteChartArrangement,
  deleteChartSection,
  importLegacyChart,
  saveChartArrangementItems,
  updateChartArrangement,
  updateChartSection,
} from "@server/services/chart-arrangement-service";
import type { ActionState } from "./auth";
import {
  optionalEventId,
  requireSongContentEditor,
  type SongContentChild,
} from "./event-authorization";

function revalidateSong(songId: string): void {
  revalidatePath("/songs");
  revalidatePath(`/songs/${songId}`);
  revalidatePath(`/songs/${songId}/chart`);
}

function chartEditorPath(
  songId: string,
  arrangementId: string,
  eventId: string | null,
): string {
  const params = new URLSearchParams({ arrangement: arrangementId });
  if (eventId) params.set("eventId", eventId);
  return `/songs/${songId}/chart?${params.toString()}`;
}

async function authorizeChartEdit(
  formData: FormData,
  songId: string,
  child?: SongContentChild,
): Promise<{ user: SessionUser; eventId: string | null }> {
  const user = await requireActionUser();
  const eventId = optionalEventId(formData.get("eventId"));
  await requireSongContentEditor(user, songId, eventId, child);
  return { user, eventId };
}

export async function createChartSectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = chartSectionCreateSchema.safeParse({
    songId: formData.get("songId"),
    type: formData.get("type"),
    label: formData.get("label"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user } = await authorizeChartEdit(formData, parsed.data.songId);
  const result = await createChartSection(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function updateChartSectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = chartSectionUpdateSchema.safeParse({
    songId: formData.get("songId"),
    sectionId: formData.get("sectionId"),
    type: formData.get("type"),
    label: formData.get("label"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user } = await authorizeChartEdit(formData, parsed.data.songId, {
    kind: "chartSection",
    id: parsed.data.sectionId,
  });
  const result = await updateChartSection(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function deleteChartSectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = chartSectionDeleteSchema.safeParse({
    songId: formData.get("songId"),
    sectionId: formData.get("sectionId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user } = await authorizeChartEdit(formData, parsed.data.songId, {
    kind: "chartSection",
    id: parsed.data.sectionId,
  });
  const result = await deleteChartSection(
    user.id,
    parsed.data.songId,
    parsed.data.sectionId,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function createChartArrangementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = chartArrangementCreateSchema.safeParse({
    songId: formData.get("songId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user, eventId } = await authorizeChartEdit(formData, parsed.data.songId);
  const result = await createChartArrangement(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  redirect(chartEditorPath(parsed.data.songId, result.id, eventId));
}

export async function updateChartArrangementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = chartArrangementUpdateSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user } = await authorizeChartEdit(formData, parsed.data.songId, {
    kind: "chartArrangement",
    id: parsed.data.arrangementId,
  });
  const result = await updateChartArrangement(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function deleteChartArrangementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = chartArrangementDeleteSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user } = await authorizeChartEdit(formData, parsed.data.songId, {
    kind: "chartArrangement",
    id: parsed.data.arrangementId,
  });
  const result = await deleteChartArrangement(
    user.id,
    parsed.data.songId,
    parsed.data.arrangementId,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function activateChartArrangementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = chartArrangementActivateSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user } = await authorizeChartEdit(formData, parsed.data.songId, {
    kind: "chartArrangement",
    id: parsed.data.arrangementId,
  });
  const result = await activateChartArrangement(
    user.id,
    parsed.data.songId,
    parsed.data.arrangementId,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function saveChartArrangementItemsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Data urutan tidak valid." };
  }
  const parsed = chartArrangementItemsSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
    items,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user } = await authorizeChartEdit(formData, parsed.data.songId, {
    kind: "chartArrangement",
    id: parsed.data.arrangementId,
  });
  const result = await saveChartArrangementItems(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function importLegacyChartAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionUser();
  const parsed = legacyChartImportSchema.safeParse({
    songId: formData.get("songId"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { user, eventId } = await authorizeChartEdit(formData, parsed.data.songId);
  const result = await importLegacyChart(
    user.id,
    parsed.data.songId,
    parsed.data.name,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  redirect(chartEditorPath(parsed.data.songId, result.id, eventId));
}
