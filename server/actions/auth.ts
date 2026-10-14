"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/session-token";
import {
  changePasswordSchema,
  firstIssueMessage,
  loginSchema,
} from "@/lib/validation/auth";
import {
  changeUserPassword,
  touchLastLogin,
  verifyCredentials,
} from "@server/services/user-service";
import {
  createSession,
  destroySession,
} from "@server/services/session-service";
import {
  clearLoginThrottle,
  isLoginThrottled,
  loginThrottleKey,
  recordFailedLogin,
} from "@server/services/login-throttle";

export interface ActionState {
  ok: boolean;
  error?: string;
}

function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

async function throttleKey(username: string): Promise<string> {
  const store = await headers();
  const ip =
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return loginThrottleKey(username, ip);
}

const GENERIC_LOGIN_ERROR = "Username atau password salah.";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const { username, password } = parsed.data;
  const key = await throttleKey(username);
  if (isLoginThrottled(key)) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan. Coba lagi beberapa menit.",
    };
  }
  const user = await verifyCredentials(username, password);
  if (!user) {
    recordFailedLogin(key);
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }
  clearLoginThrottle(key);
  const token = await createSession(user.id);
  await touchLastLogin(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) await destroySession(token);
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await changeUserPassword(
    user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.ok) return { ok: false, error: result.error };
  // Rotation: old sessions revoked, so re-login with the new password.
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login?passwordChanged=1");
}
