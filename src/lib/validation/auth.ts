import { z } from "zod";
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

export const passwordSchema = z
  .string()
  // TEMPORARY onboarding relaxation (was min 12): personil boleh memakai
  // password pendek saat fase onboarding. WAJIB revert ke min 12 setelah
  // badge "Password sementara" hilang semua di /people.
  .min(1, "Password wajib diisi.")
  .max(256, "Password maksimal 256 karakter.");

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
