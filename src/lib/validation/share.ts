import { z } from "zod";
import { parseJakartaLocalInput } from "@/lib/datetime-local";

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

// Route token from /e/[token]. Shape-checked only; existence is decided
// server-side so an unknown token never reveals an event name.
export const shareTokenSchema = z
  .string()
  .trim()
  .regex(SHARE_TOKEN_PATTERN, "Link tidak valid.");

function toOptionalDate(value: unknown): Date | undefined {
  if (value === "" || value === undefined || value === null) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  const date = parseJakartaLocalInput(String(value).trim());
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toOptionalPositiveInt(value: unknown): unknown {
  if (value === "" || value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  const n = Number(String(value).trim());
  return Number.isNaN(n) ? value : n;
}

export const shareLinkCreateSchema = z.object({
  label: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(80, "Label maksimal 80 karakter.").optional(),
  ),
  // datetime-local value dibaca sebagai WIB; kosong = tanpa kedaluwarsa.
  expiresAt: z.preprocess(toOptionalDate, z.date().optional()),
  maxUses: z.preprocess(
    toOptionalPositiveInt,
    z
      .number({ message: "Batas pemakaian harus angka." })
      .int("Batas pemakaian harus bilangan bulat.")
      .positive("Batas pemakaian harus lebih dari 0.")
      .max(1_000_000, "Batas pemakaian terlalu besar.")
      .optional(),
  ),
  includeDrafts: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
});

export type ShareLinkCreateInput = z.infer<typeof shareLinkCreateSchema>;

// Guest display name is a label only (not a username, not unique).
export const guestDisplayNameSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter.")
    .optional(),
);
