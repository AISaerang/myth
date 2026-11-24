import "server-only";
import { SHARE_GUEST_COOKIE_NAME } from "./share-token";

// Same cookie flags as the account session. The TTL is shortened to the
// earlier of 7 days or the link expiry by the caller.
export function shareGuestCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(1, Math.floor(maxAgeSeconds)),
  };
}

export { SHARE_GUEST_COOKIE_NAME };
