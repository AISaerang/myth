import "server-only";
import {
  FALLBACK_TEMP_PASSWORD,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-policy";

// Read on the server and passed into admin forms and invite copy.
// Missing, empty, or over-long values use the shared fallback so the
// form and the message stay in sync.
export function defaultTempPassword(): string {
  const raw = process.env.DEFAULT_TEMP_PASSWORD;
  if (typeof raw !== "string") return FALLBACK_TEMP_PASSWORD;
  if (raw.length < PASSWORD_MIN_LENGTH || raw.length > PASSWORD_MAX_LENGTH) {
    return FALLBACK_TEMP_PASSWORD;
  }
  return raw;
}
