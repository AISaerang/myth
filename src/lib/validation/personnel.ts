import { z } from "zod";

export const personSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
  congregation: z.string().trim().max(100).optional(),
  contact: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  isConfirmed: z.preprocess(
    (v) => v === true || v === "true" || v === "on",
    z.boolean(),
  ),
});

export const skillSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama skill minimal 2 karakter.")
    .max(50, "Nama skill maksimal 50 karakter."),
});

export const personSkillSchema = z.object({
  personId: z.string().min(1, "Personel tidak valid."),
  instrumentSkillId: z.string().min(1, "Skill tidak valid."),
  proficiencyNote: z.string().trim().max(200).optional(),
});

export type PersonInput = z.infer<typeof personSchema>;
