"use server";

import { revalidatePath } from "next/cache";
import { requireActionAdmin } from "@/lib/auth";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  personSchema,
  personSkillSchema,
  skillSchema,
} from "@/lib/validation/personnel";
import {
  assignSkill,
  createPerson,
  createSkill,
  deleteSkill,
  setPersonActive,
  unassignSkill,
  updatePerson,
} from "@server/services/personnel-service";
import type { ActionState } from "./auth";

function revalidateTeam(): void {
  revalidatePath("/team");
}

function parsePersonForm(formData: FormData) {
  return personSchema.safeParse({
    displayName: formData.get("displayName"),
    congregation: formData.get("congregation") || undefined,
    contact: formData.get("contact") || undefined,
    notes: formData.get("notes") || undefined,
    isConfirmed: formData.get("isConfirmed"),
  });
}

export async function createPersonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const parsed = parsePersonForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createPerson(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTeam();
  return { ok: true };
}

export async function updatePersonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("personId") ?? "");
  if (!id) return { ok: false, error: "Personel tidak valid." };
  const parsed = parsePersonForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await updatePerson(admin.id, id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTeam();
  return { ok: true };
}

export async function setPersonActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const id = String(formData.get("personId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!id) return { ok: false, error: "Personel tidak valid." };
  const result = await setPersonActive(admin.id, id, isActive);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTeam();
  return { ok: true };
}

export async function createSkillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const parsed = skillSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createSkill(parsed.data.name);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTeam();
  return { ok: true };
}

export async function deleteSkillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const id = String(formData.get("skillId") ?? "");
  if (!id) return { ok: false, error: "Skill tidak valid." };
  const result = await deleteSkill(id);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTeam();
  return { ok: true };
}

export async function assignSkillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const parsed = personSkillSchema.safeParse({
    personId: formData.get("personId"),
    instrumentSkillId: formData.get("instrumentSkillId"),
    proficiencyNote: formData.get("proficiencyNote") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await assignSkill(
    parsed.data.personId,
    parsed.data.instrumentSkillId,
    parsed.data.proficiencyNote,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidateTeam();
  return { ok: true };
}

export async function unassignSkillAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActionAdmin();
  const personId = String(formData.get("personId") ?? "");
  const instrumentSkillId = String(formData.get("instrumentSkillId") ?? "");
  if (!personId || !instrumentSkillId) {
    return { ok: false, error: "Data tidak valid." };
  }
  await unassignSkill(personId, instrumentSkillId);
  revalidateTeam();
  return { ok: true };
}
