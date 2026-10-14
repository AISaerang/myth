import "server-only";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./session-token";

// Shared HttpOnly session cookie options for every login path
// (password login, invite redemption). Raw tokens live only here.
export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export { SESSION_COOKIE_NAME };
