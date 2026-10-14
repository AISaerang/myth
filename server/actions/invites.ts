"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActionAdmin } from "@/lib/auth";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session-cookie";
import {
  firstIssueMessage,
  inviteTokenSchema,
} from "@/lib/validation/auth";
import type { ActionState } from "./auth";
import {
  createInviteLink,
  inviteRedeemThrottleKey,
  redeemInviteToken,
} from "@server/services/invite-service";
import {
  isLoginThrottled,
  recordFailedLogin,
} from "@server/services/login-throttle";

export interface InviteState extends ActionState {
  username?: string;
  inviteLink?: string;
}

function appBaseUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

// Admin issues a personal login link. Plaintext leaves the server
// exactly once, in this response (same rule as temporary passwords).
export async function createInviteAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const admin = await requireActionAdmin();
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) return { ok: false, error: "Akun tidak valid." };
  const result = await createInviteLink(admin.id, targetUserId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/people");
  return {
    ok: true,
    username: result.username,
    inviteLink: `${appBaseUrl()}/masuk/${result.inviteToken}`,
  };
}

// Public redemption (POST only, so chat-link previews never burn the
// single-use token). Sets the standard session cookie on success.
export async function redeemInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = inviteTokenSchema.safeParse(formData.get("token"));
  const store = await headers();
  const ip =
    store.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!parsed.success) {
    recordFailedLogin(inviteRedeemThrottleKey(ip));
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  if (isLoginThrottled(inviteRedeemThrottleKey(ip))) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan. Coba lagi beberapa menit.",
    };
  }
  const result = await redeemInviteToken(parsed.data, ip);
  if (!result.ok) return { ok: false, error: result.error };
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, result.sessionToken, sessionCookieOptions());
  redirect(result.mustChangePassword ? "/change-password" : "/dashboard");
}
