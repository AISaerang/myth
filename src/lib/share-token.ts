import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Dedicated event share link (guest or account). Mirrors the invite/session
// pattern: opaque 256-bit token, only its SHA-256 hash is stored server-side,
// so a database read alone never yields a usable link. Plaintext leaves the
// server exactly once (shown to the issuing admin).
export const SHARE_GUEST_COOKIE_NAME = "myth_share_guest";
export const SHARE_GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isShareTokenShape(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_PATTERN.test(value);
}

// Login callback must be a relative path to the share route. Reject absolute
// URLs, protocol-relative URLs, backslashes, traversal, and anything that is
// not exactly "/e/{token}".
export function sanitizeShareCallback(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw.startsWith("/e/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("\\") || raw.includes("//") || raw.includes("..")) {
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, "http://localhost");
  } catch {
    return null;
  }
  if (url.origin !== "http://localhost") return null;
  if (url.search || url.hash) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "e") return null;
  if (!isShareTokenShape(parts[1])) return null;
  return `/e/${parts[1]}`;
}
