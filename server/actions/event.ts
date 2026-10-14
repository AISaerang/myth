"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActionAdmin } from "@/lib/auth";
import { firstIssueMessage } from "@/lib/validation/auth";
import { eventSchema } from "@/lib/validation/event";
import { createEvent, updateEvent } from "@server/services/event-service";
import type { ActionState } from "./auth";

function parseEventForm(formData: FormData) {
  return eventSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    eventDate: formData.get("eventDate") || undefined,
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    venue: formData.get("venue") || undefined,
    theme: formData.get("theme") || undefined,
    targetDurationMinutes: formData.get("targetDurationMinutes") || undefined,
    eventStatus: formData.get("eventStatus"),
    liturgicalFlowUrl: formData.get("liturgicalFlowUrl") || undefined,
    committeePicName: formData.get("committeePicName") || undefined,
    committeePicContact: formData.get("committeePicContact") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const event = await createEvent(admin.id, parsed.data);
  revalidatePath("/event");
  redirect(`/event/${event.id}`);
}

export async function updateEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("eventId") ?? "");
  if (!id) return { ok: false, error: "Event tidak valid." };
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await updateEvent(admin.id, id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/event");
  revalidatePath(`/event/${id}`);
  return { ok: true };
}
