"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireActionAdmin, requireActionUser } from "@/lib/auth";
import { ACTIVE_EVENT_COOKIE } from "@/lib/event-context";
import { firstIssueMessage } from "@/lib/validation/auth";
import { eventSchema } from "@/lib/validation/event";
import { getAccessibleEvent } from "@server/services/event-access";
import { createEvent, updateEvent } from "@server/services/event-service";
import { requireEventManager } from "./event-authorization";
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
    eventType: formData.get("eventType") || undefined,
    region: formData.get("region") || undefined,
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
  const admin = await requireActionUser();
  const id = String(formData.get("eventId") ?? "");
  if (!id) return { ok: false, error: "Event tidak valid." };
  await requireEventManager(admin, id);
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

export async function setActiveEventAction(formData: FormData): Promise<void> {
  const user = await requireActionUser();
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId || !(await getAccessibleEvent(user, eventId))) {
    throw new Error("Event tidak tersedia.");
  }
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_EVENT_COOKIE, eventId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}
