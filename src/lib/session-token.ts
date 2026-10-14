import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "mth_session";
// 7 days, in seconds (cookie maxAge) and milliseconds (DB expiry).
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

// Opaque 256-bit token. Only its SHA-256 hash is stored server-side,
// so a database read alone never yields a usable session.
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
