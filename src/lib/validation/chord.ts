import { z } from "zod";

const requiredKey = z
  .string()
  .trim()
  .min(1, "Nada dasar asal wajib diisi.")
  .max(8, "Nada dasar maksimal 8 karakter.")
  .regex(/^[A-G][#b]?$/i, "Format nada tidak valid (cth. G, Bb, F#).");

export const chordChartSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  content: z
    .string()
    .trim()
    .min(10, "Konten ChordPro minimal 10 karakter.")
    .max(20000, "Konten maksimal 20000 karakter.")
    .refine((v) => /\[([^\]]+)\]/.test(v), "Konten harus memuat chord [..]."),
  originalKey: requiredKey,
  label: z.string().trim().max(50).optional(),
});

export type ChordChartInput = z.infer<typeof chordChartSchema>;

// Edit chart aktif: konten sudah basis C, jadi tidak perlu nada asal lagi.
export const chordChartUpdateSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  chartId: z.string().min(1, "Chart tidak valid."),
  content: chordChartSchema.shape.content,
  label: chordChartSchema.shape.label,
});

export type ChordChartUpdateInput = z.infer<typeof chordChartUpdateSchema>;
