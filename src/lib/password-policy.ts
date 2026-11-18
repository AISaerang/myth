// Shared by server Zod schemas and password inputs. Bootstrap admin
// keeps its own 12-character check in scripts/bootstrap-admin.ts.
export const PASSWORD_MIN_LENGTH = 1;
export const PASSWORD_MAX_LENGTH = 256;

// Shared onboarding password when DEFAULT_TEMP_PASSWORD is unset.
// It is temporary: create/reset still set mustChangePassword.
export const FALLBACK_TEMP_PASSWORD = "1234567890ais";

export const DEFAULT_TEMP_PASSWORD_HELPER =
  "Password sementara default; pengguna wajib menggantinya saat login pertama.";
