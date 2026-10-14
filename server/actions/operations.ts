"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionAdmin } from "@/lib/auth";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  attendanceSchema,
  decisionSchema,
  equipmentSchema,
  rehearsalSchema,
} from "@/lib/validation/operations";
import { createDecision } from "@server/services/decision-service";
import {
  createEquipment,
  updateEquipment,
} from "@server/services/equipment-service";
import {
  createRehearsal,
  setRehearsalSongs,
  updateRehearsal,
  upsertAttendance,
} from "@server/services/rehearsal-service";
import type { ActionState } from "./auth";

function revalidateOps(rehearsalId?: string): void {
  revalidatePath("/rehearsals");
  revalidatePath("/equipment");
  revalidatePath("/decisions");
  revalidatePath("/tasks");
  if (rehearsalId) revalidatePath(`/rehearsals/${rehearsalId}`);
}

function parseRehearsalForm(formData: FormData, withEvent: boolean) {
  return rehearsalSchema.safeParse({
    ...(withEvent ? { eventId: formData.get("eventId") } : {}),
    title: formData.get("title"),
    type: formData.get("type"),
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    venueOrMeetingUrl: formData.get("venueOrMeetingUrl") || undefined,
    agenda: formData.get("agenda") || undefined,
    status: formData.get("status") ?? "SCHEDULED",
    notes: formData.get("notes") || undefined,
  });
}

export async function createRehearsalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = parseRehearsalForm(formData, true);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createRehearsal(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateOps();
  redirect(`/rehearsals/${result.id}`);
}

export async function updateRehearsalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("rehearsalId") ?? "");
  if (!id) return { ok: false, error: "Rehearsal tidak valid." };
  const parsed = parseRehearsalForm(formData, false);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { eventId: _event, ...input } = parsed.data;
  void _event;
  const result = await updateRehearsal(admin.id, id, input);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateOps(id);
  return { ok: true };
}

export async function setRehearsalSongsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const rehearsalId = String(formData.get("rehearsalId") ?? "");
  if (!rehearsalId) return { ok: false, error: "Rehearsal tidak valid." };
  const songIds = formData.getAll("songIds").map(String);
  const result = await setRehearsalSongs(rehearsalId, songIds);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateOps(rehearsalId);
  return { ok: true };
}

export async function upsertAttendanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const parsed = attendanceSchema.safeParse({
    rehearsalId: formData.get("rehearsalId"),
    personId: formData.get("personId"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await upsertAttendance(parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateOps(parsed.data.rehearsalId);
  return { ok: true };
}

function parseEquipmentForm(formData: FormData, withEvent: boolean) {
  return equipmentSchema.safeParse({
    ...(withEvent ? { eventId: formData.get("eventId") } : {}),
    name: formData.get("name"),
    category: formData.get("category"),
    quantity: formData.get("quantity") || undefined,
    status: formData.get("status") ?? "NOT_CHECKED",
    ownerOrSource: formData.get("ownerOrSource") || undefined,
    assigneePersonId: formData.get("assigneePersonId") || undefined,
    dueAt: formData.get("dueAt") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createEquipmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = parseEquipmentForm(formData, true);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createEquipment(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateOps();
  return { ok: true };
}

export async function updateEquipmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("itemId") ?? "");
  if (!id) return { ok: false, error: "Item tidak valid." };
  const parsed = parseEquipmentForm(formData, false);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { eventId: _event, ...input } = parsed.data;
  void _event;
  const result = await updateEquipment(admin.id, id, input);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateOps();
  return { ok: true };
}

export async function createDecisionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = decisionSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    decisionType: formData.get("decisionType"),
    decisionText: formData.get("decisionText"),
    reason: formData.get("reason") || undefined,
    decidedBy: formData.get("decidedBy") || undefined,
    relatedSongId: formData.get("relatedSongId") || undefined,
    relatedRehearsalId: formData.get("relatedRehearsalId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createDecision(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateOps(parsed.data.relatedRehearsalId);
  return { ok: true };
}
