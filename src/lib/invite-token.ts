import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Personal invite token (magic link), 7 days, single-use.
// Mirrors the session pattern: opaque 256-bit token, only its SHA-256
// hash is stored server-side, so a database read alone never yields a
// usable login link. Plaintext leaves the server exactly once (shown to
// the issuing admin), and redemption consumes the token.
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
