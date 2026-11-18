import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-policy";
import { normalizeUsername } from "@/lib/username";

// Username rules shared by login and account management:
// 3-32 chars, letters/numbers plus . _ - ; stored normalized.
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter.")
  .max(32, "Username maksimal 32 karakter.")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Username hanya boleh huruf, angka, titik, underscore, dan strip.",
  )
  .transform((v) => normalizeUsername(v));

// New and changed passwords (change-password, admin create, admin reset):
// reject empty only. Bootstrap admin stays at 12 characters in its script,
// outside this schema. See docs/06-AUTHENTICATION-RBAC.md.
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "Password wajib diisi.")
  .max(PASSWORD_MAX_LENGTH, "Password maksimal 256 karakter.");

// Blank admin field means "generate a temporary password". A non-empty
// value is the password that will be hashed.
export function optionalAdminPassword(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value;
}

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password wajib diisi."),
});

// Personal invite token from /masuk/[token]: opaque base64url string.
// Shape-checked only; validity is decided server-side with a generic
// error so callers never learn whether a token exists.
export const inviteTokenSchema = z
  .string()
  .trim()
  .min(20, "Link undangan tidak valid.")
  .max(128, "Link undangan tidak valid.")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Link undangan tidak valid.",
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Password baru harus berbeda dari password saat ini.",
    path: ["newPassword"],
  });

export const roleSchema = z.enum(["ADMIN", "USER", "OBSERVER"], {
  message: "Role harus ADMIN, USER, atau OBSERVER.",
});

export const createUserSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(2, "Nama tampilan minimal 2 karakter.")
    .max(100, "Nama tampilan maksimal 100 karakter."),
  role: roleSchema,
  password: passwordSchema.optional(),
});

export const updateUserSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Nama tampilan minimal 2 karakter.")
    .max(100, "Nama tampilan maksimal 100 karakter."),
  role: roleSchema,
});

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input tidak valid.";
}
