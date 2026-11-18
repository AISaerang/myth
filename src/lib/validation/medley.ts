import { z } from "zod";
import { looksLikeNotationLine } from "@/lib/jianpu";
import { normalizeNotationInput } from "@/lib/jianpu";
import { notationLineError } from "@/lib/jianpu-align";

export const medleyTransitionSchema = z
  .object({
    batchId: z.string().min(1, "Batch tidak valid."),
    fromSongId: z.string().min(1, "Lagu awal tidak valid."),
    toSongId: z.string().min(1, "Lagu berikutnya tidak valid."),
    content: z
      .string()
      .trim()
      .max(4000, "Isi transisi maksimal 4000 karakter.")
      .default("")
      .transform(normalizeNotationInput)
      .superRefine((content, ctx) => {
        for (const [index, line] of content.split(/\r?\n/).entries()) {
          if (looksLikeNotationLine(line)) {
            const error = notationLineError(line);
            if (error) {
              ctx.addIssue({
                code: "custom",
                message: `Baris ${index + 1}: ${error}`,
              });
              return;
            }
          }
        }
      }),
    notes: z.string().trim().max(2000).optional().nullable(),
    remove: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.remove && !value.content) {
      ctx.addIssue({
        code: "custom",
        message: "Isi transisi wajib diisi.",
        path: ["content"],
      });
    }
    if (value.fromSongId === value.toSongId) {
      ctx.addIssue({
        code: "custom",
        message: "Lagu awal dan tujuan harus berbeda.",
        path: ["toSongId"],
      });
    }
  });

export type MedleyTransitionInput = z.infer<typeof medleyTransitionSchema>;
