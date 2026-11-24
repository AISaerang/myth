"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActionUser } from "@/lib/auth";
import {
  SHARE_GUEST_COOKIE_NAME,
  shareGuestCookieOptions,
} from "@/lib/share-cookie";
import {
  SHARE_GUEST_TTL_MS,
  isShareTokenShape,
} from "@/lib/share-token";
import {
  SHARE_THROTTLE_MESSAGE,
  shareLinkErrorMessage,
} from "@/lib/share-link";
import {
  guestDisplayNameSchema,
  shareLinkCreateSchema,
  shareTokenSchema,
} from "@/lib/validation/share";
import { firstIssueMessage } from "@/lib/validation/auth";
import type { ActionState } from "./auth";
import { requireEventAccessManager } from "./event-authorization";
import {
  createGuestSession,
  createShareLink,
  recordShareLinkUse,
  resolveShareLinkGuarded,
  revokeShareLink,
  shareLookupThrottleKey,
} from "@server/services/share-link-service";
import {
  clearLoginThrottle,
  isLoginThrottled,
  recordFailedLogin,
} from "@server/services/login-throttle";

export interface ShareLinkCreateState extends ActionState {
  shareUrl?: string;
  createdId?: string;
}

function appBaseUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

async function requesterIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function createShareLinkAction(
  _prev: ShareLinkCreateState,
  formData: FormData,
): Promise<ShareLinkCreateState> {
  const user = await requireActionUser();
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) return { ok: false, error: "Event tidak valid." };
  await requireEventAccessManager(user, eventId);

  const parsed = shareLinkCreateSchema.safeParse({
    label: formData.get("label"),
    expiresAt: formData.get("expiresAt"),
    maxUses: formData.get("maxUses"),
    includeDrafts: formData.get("includeDrafts"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  const result = await createShareLink(user.id, eventId, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/event/${eventId}`);
  return {
    ok: true,
    createdId: result.id,
    shareUrl: `${appBaseUrl()}/e/${result.token}`,
  };
}

export async function revokeShareLinkAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!eventId || !linkId) return { ok: false, error: "Tautan tidak valid." };
  await requireEventAccessManager(user, eventId);
  const result = await revokeShareLink(user.id, eventId, linkId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/event/${eventId}`);
  return { ok: true };
}

// Public guest start. Only POST, so chat-link previews never create a
// guest session or consume a use.
export async function startGuestSessionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await requesterIp();
  const key = shareLookupThrottleKey(ip);
  if (isLoginThrottled(key)) {
    return { ok: false, error: SHARE_THROTTLE_MESSAGE };
  }
  const tokenParsed = shareTokenSchema.safeParse(formData.get("token"));
  if (!tokenParsed.success) {
    recordFailedLogin(key);
    return { ok: false, error: "Link tidak valid." };
  }
  const nameParsed = guestDisplayNameSchema.safeParse(
    formData.get("displayName"),
  );
  if (!nameParsed.success) {
    return { ok: false, error: firstIssueMessage(nameParsed.error) };
  }
  const resolved = await resolveShareLinkGuarded(tokenParsed.data, ip);
  if (!resolved.ok) {
    if (resolved.reason === null) {
      return { ok: false, error: SHARE_THROTTLE_MESSAGE };
    }
    return { ok: false, error: shareLinkErrorMessage(resolved.reason) };
  }
  const sessionToken = await createGuestSession(
    resolved.link,
    nameParsed.data,
  );
  const maxAgeSeconds = Math.max(
    1,
    Math.floor(
      Math.min(
        SHARE_GUEST_TTL_MS,
        resolved.link.expiresAt
          ? resolved.link.expiresAt.getTime() - Date.now()
          : SHARE_GUEST_TTL_MS,
      ) / 1000,
    ),
  );
  const jar = await cookies();
  jar.set(
    SHARE_GUEST_COOKIE_NAME,
    sessionToken,
    shareGuestCookieOptions(maxAgeSeconds),
  );
  await recordShareLinkUse(resolved.link.id);
  clearLoginThrottle(key);
  redirect(`/e/${tokenParsed.data}/tamu`);
}

export async function exitGuestAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  const jar = await cookies();
  jar.delete(SHARE_GUEST_COOKIE_NAME);
  redirect(isShareTokenShape(token) ? `/e/${token}` : "/login");
}

// Called by the guest shell when the cookie or link is no longer valid.
// It only removes the caller's own guest cookie; no event data is touched.
export async function clearGuestCookieAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SHARE_GUEST_COOKIE_NAME);
}
