"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionAdmin } from "@/lib/auth";
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

function revalidateSong(songId: string): void {
  revalidatePath("/songs");
  revalidatePath(`/songs/${songId}`);
  revalidatePath(`/songs/${songId}/chart`);
}

export async function createChartSectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = chartSectionCreateSchema.safeParse({
    songId: formData.get("songId"),
    type: formData.get("type"),
    label: formData.get("label"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createChartSection(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function updateChartSectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
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
  const result = await updateChartSection(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function deleteChartSectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = chartSectionDeleteSchema.safeParse({
    songId: formData.get("songId"),
    sectionId: formData.get("sectionId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await deleteChartSection(
    admin.id,
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
  const admin = await requireActionAdmin();
  const parsed = chartArrangementCreateSchema.safeParse({
    songId: formData.get("songId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createChartArrangement(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  redirect(`/songs/${parsed.data.songId}/chart?arrangement=${result.id}`);
}

export async function updateChartArrangementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = chartArrangementUpdateSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await updateChartArrangement(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function deleteChartArrangementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = chartArrangementDeleteSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await deleteChartArrangement(
    admin.id,
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
  const admin = await requireActionAdmin();
  const parsed = chartArrangementActivateSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await activateChartArrangement(
    admin.id,
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
  const admin = await requireActionAdmin();
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
  const result = await saveChartArrangementItems(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function importLegacyChartAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = legacyChartImportSchema.safeParse({
    songId: formData.get("songId"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await importLegacyChart(
    admin.id,
    parsed.data.songId,
    parsed.data.name,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  redirect(`/songs/${parsed.data.songId}/chart?arrangement=${result.id}`);
}
