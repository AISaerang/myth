"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionUser } from "@/lib/auth";
import { usernameSchema } from "@/lib/validation/auth";
import { requireEventManager } from "./event-authorization";
import type { ActionState } from "./auth";
import {
  addEventMembership,
  changeEventMembershipRole,
  removeEventMembership,
} from "@server/services/event-membership-service";

const eventRoleSchema = z.enum(["EVENT_ADMIN", "MEMBER", "OBSERVER"]);

function revalidateMembers(eventId: string): void {
  revalidatePath(`/event/${eventId}`);
  revalidatePath(`/event/${eventId}/members`);
  revalidatePath("/event");
}

export async function addEventMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActionUser();
  const eventId = String(formData.get("eventId") ?? "");
  const parsed = z
    .object({ username: usernameSchema, role: eventRoleSchema })
    .safeParse({
      username: formData.get("username"),
      role: formData.get("role"),
    });
  if (!eventId || !parsed.success) {
    return { ok: false, error: parsed.success ? "Event tidak valid." : parsed.error.issues[0]?.message };
  }
  await requireEventManager(actor, eventId);
  const result = await addEventMembership(
    actor.id,
    eventId,
    parsed.data.username,
    parsed.data.role,
  );
  if (!result.ok) return result;
  revalidateMembers(eventId);
  return { ok: true };
}

export async function changeEventMemberRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActionUser();
  const eventId = String(formData.get("eventId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = eventRoleSchema.safeParse(formData.get("role"));
  if (!eventId || !membershipId || !role.success) {
    return { ok: false, error: "Data membership tidak valid." };
  }
  await requireEventManager(actor, eventId);
  const result = await changeEventMembershipRole(
    actor.id,
    eventId,
    membershipId,
    role.data,
  );
  if (!result.ok) return result;
  revalidateMembers(eventId);
  return { ok: true };
}

export async function removeEventMemberAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActionUser();
  const eventId = String(formData.get("eventId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  if (!eventId || !membershipId) {
    return { ok: false, error: "Data membership tidak valid." };
  }
  await requireEventManager(actor, eventId);
  const result = await removeEventMembership(actor.id, eventId, membershipId);
  if (!result.ok) return result;
  revalidateMembers(eventId);
  return { ok: true };
}
