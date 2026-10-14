import "server-only";
import * as argon2 from "argon2";
import { randomInt } from "node:crypto";

// Argon2id per docs/06-AUTHENTICATION-RBAC.md. Plaintext passwords are
// never stored or logged anywhere in this codebase.

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Malformed hash or verification failure: treat as mismatch.
    // Never leak the reason to the caller.
    return false;
  }
}

const TEMP_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%-_";

// Strong one-time temporary password. Shown to the admin exactly once at
// creation/reset; the user must change it on first login.
export function generateTemporaryPassword(length = 20): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
  }
  return out;
}
