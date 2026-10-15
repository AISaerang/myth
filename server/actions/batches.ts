"use server";
import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";

import { z } from "zod";
import { requireActionAdmin } from "@/lib/auth";
import { canTransitionBatch } from "@/lib/batch-status";
import { firstIssueMessage } from "@/lib/validation/auth";
import { batchSchema, batchStatusSchema } from "@/lib/validation/song";
import {
  addSongToBatch,
  createBatch,
  getBatch,
  removeSongFromBatch,
  setBatchStatus,
  updateBatch,
} from "@server/services/batch-service";
import type { ActionState } from "./auth";

function revalidateBatches(batchId?: string): void {
  revalidatePath("/batches");
  revalidatePath("/songs");
  if (batchId) revalidatePath(`/batches/${batchId}`);
}

function parseBatchForm(formData: FormData, withEvent: boolean) {
  return batchSchema.safeParse({
    ...(withEvent ? { eventId: formData.get("eventId") } : {}),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    releaseAt: formData.get("releaseAt") || undefined,
    targetReviewAt: formData.get("targetReviewAt") || undefined,
    status: formData.get("status") ?? "DRAFT",
  });
}

export async function createBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = parseBatchForm(formData, true);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createBatch(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateBatches();
  redirect(`/batches/${result.id}`);
}

export async function updateBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("batchId") ?? "");
  if (!id) return { ok: false, error: "Batch tidak valid." };
  const parsed = parseBatchForm(formData, false);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { status: _status, eventId: _event, ...input } = parsed.data;
  void _status;
  void _event;
  const result = await updateBatch(admin.id, id, input);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateBatches(id);
  return { ok: true };
}

export async function setBatchStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("batchId") ?? "");
  const parsedStatus = batchStatusSchema.safeParse(formData.get("status"));
  if (!id || !parsedStatus.success) {
    return { ok: false, error: "Data tidak valid." };
  }
  const batch = await getBatch(id);
  if (!batch) return { ok: false, error: "Batch tidak ditemukan." };
  if (!canTransitionBatch(batch.status, parsedStatus.data)) {
    return {
      ok: false,
      error: `Transisi ${batch.status} → ${parsedStatus.data} tidak diizinkan.`,
    };
  }
  const result = await setBatchStatus(admin.id, id, parsedStatus.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateBatches(id);
  return { ok: true };
}

export async function addSongToBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const batchId = String(formData.get("batchId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!batchId || !songId) return { ok: false, error: "Data tidak valid." };
  const result = await addSongToBatch(batchId, songId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateBatches(batchId);
  return { ok: true };
}

export async function removeSongFromBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const batchId = String(formData.get("batchId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!batchId || !songId) return { ok: false, error: "Data tidak valid." };
  await removeSongFromBatch(batchId, songId);
  revalidateBatches(batchId);
  return { ok: true };
}

export async function deleteBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return { ok: false, error: "Batch tidak valid." };
  const { deleteBatch } = await import("@server/services/batch-service");
  const result = await deleteBatch(admin.id, batchId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateBatches();
  return { ok: true };
}

const orderedIdsSchema = z
  .array(z.string().min(1))
  .min(1, "Daftar urutan kosong.");

export async function reorderBatchItemsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const batchId = String(formData.get("batchId") ?? "");
  let ordered: unknown = [];
  try {
    ordered = JSON.parse(String(formData.get("orderedIds") ?? "[]"));
  } catch {
    return { ok: false, error: "Format urutan tidak valid." };
  }
  const parsed = orderedIdsSchema.safeParse(ordered);
  if (!batchId || !parsed.success) {
    return { ok: false, error: "Data tidak valid." };
  }
  const { reorderBatchItems } = await import(
    "@server/services/batch-service"
  );
  const result = await reorderBatchItems(batchId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateBatches(batchId);
  return { ok: true };
}
