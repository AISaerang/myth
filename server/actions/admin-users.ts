"use server";

import { revalidatePath } from "next/cache";
import { requireActionAdmin } from "@/lib/auth";
import {
  createUserSchema,
  firstIssueMessage,
  updateUserSchema,
} from "@/lib/validation/auth";
import {
  createUserWithTemporaryPassword,
  resetUserPassword,
  setUserActive,
  updateUserProfile,
} from "@server/services/user-service";
import type { ActionState } from "./auth";

export interface AdminUserState extends ActionState {
  username?: string;
  temporaryPassword?: string;
}

// All mutations below re-check ADMIN server-side (docs/06).
// Hidden UI is not authorization.

export async function createUserAction(
  _prev: AdminUserState,
  formData: FormData,
): Promise<AdminUserState> {
  const admin = await requireActionAdmin();
  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createUserWithTemporaryPassword(admin.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/people");
  // Plaintext leaves the server exactly once, in this response.
  return {
    ok: true,
    username: result.user.username,
    temporaryPassword: result.temporaryPassword,
  };
}

export async function resetUserPasswordAction(
  _prev: AdminUserState,
  formData: FormData,
): Promise<AdminUserState> {
  const admin = await requireActionAdmin();
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) return { ok: false, error: "Akun tidak valid." };
  const result = await resetUserPassword(admin.id, targetUserId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/people");
  return {
    ok: true,
    username: result.username,
    temporaryPassword: result.temporaryPassword,
  };
}

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const targetUserId = String(formData.get("userId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!targetUserId) return { ok: false, error: "Akun tidak valid." };
  const result = await setUserActive(admin.id, targetUserId, isActive);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/people");
  return { ok: true };
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireActionAdmin();
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) return { ok: false, error: "Akun tidak valid." };
  const parsed = updateUserSchema.safeParse({
    displayName: formData.get("displayName"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await updateUserProfile(admin.id, targetUserId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/people");
  return { ok: true };
}
