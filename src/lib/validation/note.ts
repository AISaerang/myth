import { z } from "zod";

const bodySchema = z
  .string()
  .trim()
  .min(2, "Catatan minimal 2 karakter.")
  .max(2000, "Catatan maksimal 2000 karakter.");

const partLabelSchema = z
  .string()
  .trim()
  .max(80, "Nama part maksimal 80 karakter.")
  .optional();

export const songNoteSchema = z.object({
  eventSongId: z.string().min(1, "Lagu event tidak valid."),
  songId: z.string().min(1, "Lagu tidak valid."),
  // Null/absent = catatan level lagu (tidak menempel ke bagian tertentu).
  sectionId: z.string().min(1).optional(),
  // Hanya balasan satu tingkat; server memastikan induknya top-level.
  parentId: z.string().min(1).optional(),
  // Null/absent = catatan umum; target hanya dapat dipilih dari assignment lagu.
  targetInstrumentSkillId: z.string().min(1).optional(),
  partLabel: partLabelSchema,
  body: bodySchema,
});

export const songNoteUpdateSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  sectionId: z.string().min(1).optional(),
  partLabel: partLabelSchema,
  body: bodySchema,
});

export const songNoteResolveSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  resolved: z.enum(["true", "false"]),
});

export type SongNoteInput = z.infer<typeof songNoteSchema>;
export type SongNoteUpdateInput = z.infer<typeof songNoteUpdateSchema>;
