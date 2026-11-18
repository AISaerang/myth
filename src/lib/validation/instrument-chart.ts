import { z } from "zod";
import { parseChord } from "@/lib/chords";
import { parsePitch } from "@/lib/pitch";

const chordSymbol = z
  .string()
  .trim()
  .min(1, "Simbol chord wajib diisi.")
  .max(32, "Simbol chord terlalu panjang.")
  .refine((value) => {
    try {
      parseChord(value);
      return true;
    } catch {
      return false;
    }
  }, "Simbol chord tidak valid.");

const pitch = z
  .string()
  .max(5)
  .refine((value) => {
    try {
      parsePitch(value);
      return true;
    } catch {
      return false;
    }
  }, "Nada piano tidak valid.");

export const guitarShapeSchema = z.object({
  frets: z
    .array(z.union([z.number().int().min(0).max(24), z.literal("x")]))
    .length(6),
  fingers: z.array(z.number().int().min(0).max(4)).length(6),
  barre: z
    .object({
      fret: z.number().int().min(1).max(24),
      fromString: z.number().int().min(0).max(5),
      toString: z.number().int().min(0).max(5),
    })
    .refine((barre) => barre.fromString < barre.toString)
    .nullable(),
  baseFret: z.number().int().min(1).max(24),
}).superRefine((shape, context) => {
  for (const [index, fret] of shape.frets.entries()) {
    const finger = shape.fingers[index] ?? 0;
    if (
      (fret === "x" || fret === 0) !== (finger === 0) ||
      (typeof fret === "number" &&
        fret > 0 &&
        (fret < shape.baseFret || fret > shape.baseFret + 3))
    ) {
      context.addIssue({
        code: "custom",
        path: ["frets", index],
        message: "Fret dan jari harus sesuai dengan diagram empat fret.",
      });
    }
  }
  if (
    shape.barre &&
    (shape.barre.fret < shape.baseFret ||
      shape.barre.fret > shape.baseFret + 3 ||
      !shape.frets
        .slice(shape.barre.fromString, shape.barre.toString + 1)
      .some((fret) => fret === shape.barre?.fret))
  ) {
    context.addIssue({
      code: "custom",
      path: ["barre"],
      message: "Barre harus menutup senar pada fret yang sama.",
    });
  }
});

export const pianoVoicingSchema = z.object({
  lh: z.array(pitch).max(8),
  rh: z.array(pitch).max(8),
});

const sectionMetadataSchema = z.object({
  dynamic: z
    .enum(["pp", "p", "mp", "mf", "f", "ff", "cresc.", "decresc.", "rit."])
    .optional(),
  rhythm: z
    .object({
      meter: z.string().trim().max(8).optional(),
      guitar: z.string().trim().max(80).optional(),
      piano: z.string().trim().max(80).optional(),
    })
    .optional(),
});

export const instrumentOverrideSchema = z.object({
  guitar: guitarShapeSchema.optional(),
  piano: pianoVoicingSchema.optional(),
});

export const instrumentChartDataSchema = z.object({
  sections: z.record(z.string().min(1).max(191), sectionMetadataSchema),
  voicings: z.record(chordSymbol, instrumentOverrideSchema).superRefine(
    (voicings, context) => {
      if (Object.keys(voicings).length > 500) {
        context.addIssue({
          code: "custom",
          message: "Maksimal 500 override voicing.",
        });
      }
    },
  ),
});

export const instrumentChartInputSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  capo: z.number().int().min(0).max(11),
  data: instrumentChartDataSchema,
});

export type InstrumentChartData = z.infer<typeof instrumentChartDataSchema>;
export type InstrumentChartInput = z.infer<typeof instrumentChartInputSchema>;

export function filterExistingInstrumentSections(
  data: InstrumentChartData,
  existingSectionIds: ReadonlySet<string>,
): InstrumentChartData {
  return {
    ...data,
    sections: Object.fromEntries(
      Object.entries(data.sections).filter(([id]) => existingSectionIds.has(id)),
    ),
  };
}
