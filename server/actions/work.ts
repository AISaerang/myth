"use server";

import { revalidatePath } from "next/cache";
import { requireActionAdmin, requireActionUser } from "@/lib/auth";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  progressSchema,
  taskSchema,
  taskStatusUpdateSchema,
} from "@/lib/validation/work";
import {
  correctProgress,
  upsertMyProgress,
} from "@server/services/progress-service";
import {
  createTask,
  updateMyTaskStatus,
  updateTask,
} from "@server/services/task-service";
import type { ActionState } from "./auth";

export async function updateMyProgressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const parsed = progressSchema.safeParse({
    songId: formData.get("songId"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await upsertMyProgress(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/songs/${parsed.data.songId}`);
  return { ok: true };
}

export async function correctProgressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const songId = String(formData.get("songId") ?? "");
  const personId = String(formData.get("personId") ?? "");
  if (!songId || !personId) return { ok: false, error: "Data tidak valid." };
  const parsed = progressSchema.safeParse({
    songId,
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await correctProgress(admin.id, songId, personId, {
    status: parsed.data.status,
    note: parsed.data.note,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/songs/${songId}`);
  return { ok: true };
}

function parseTaskForm(formData: FormData, withEvent: boolean) {
  return taskSchema.safeParse({
    ...(withEvent ? { eventId: formData.get("eventId") } : {}),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    status: formData.get("status") ?? "TODO",
    priority: formData.get("priority") ?? "MEDIUM",
    dueAt: formData.get("dueAt") || undefined,
    assigneePersonId: formData.get("assigneePersonId") || undefined,
    relatedSongId: formData.get("relatedSongId") || undefined,
    relatedRehearsalId: formData.get("relatedRehearsalId") || undefined,
  });
}

function revalidateTasks(songId?: string): void {
  revalidatePath("/tasks");
  if (songId) revalidatePath(`/songs/${songId}`);
}

export async function createTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = parseTaskForm(formData, true);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createTask(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTasks(parsed.data.relatedSongId);
  return { ok: true };
}

export async function updateTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const id = String(formData.get("taskId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!id || !eventId) return { ok: false, error: "Data tidak valid." };
  const parsed = parseTaskForm(formData, false);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await updateTask(id, { ...parsed.data, eventId });
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTasks(parsed.data.relatedSongId);
  return { ok: true };
}

export async function updateMyTaskStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const taskId = String(formData.get("taskId") ?? "");
  const parsed = taskStatusUpdateSchema.safeParse({
    status: formData.get("status"),
  });
  if (!taskId || !parsed.success) {
    return { ok: false, error: "Data tidak valid." };
  }
  const result = await updateMyTaskStatus(user.id, taskId, parsed.data.status);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTasks();
  return { ok: true };
}
