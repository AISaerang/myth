import { z } from "zod";

export const songStatusSchema = z.enum(
  [
    "DRAFT",
    "SOURCE_SHARED",
    "ARRANGEMENT_IN_PROGRESS",
    "REFERENCE_READY",
    "PRACTICING",
    "NEEDS_REVIEW",
    "READY_FOR_REHEARSAL",
    "REHEARSAL_READY",
    "FINAL_LOCKED",
  ],
  { message: "Status lagu tidak valid." },
);

export const batchStatusSchema = z.enum(
  ["DRAFT", "PUBLISHED", "REVIEWING", "COMPLETED", "ARCHIVED"],
  { message: "Status batch tidak valid." },
);

export const materialCategorySchema = z.enum(
  [
    "ORIGINAL",
    "ARRANGEMENT_REFERENCE",
    "PART_GUIDE",
    "CHORD_CHART",
    "LYRICS",
    "CLICK_CUE",
    "SEQUENCER",
    "REHEARSAL_RECORDING",
    "FINAL_ASSET",
    "OTHER",
  ],
  { message: "Kategori materi tidak valid." },
);

const musicalKey = z
  .string()
  .trim()
  .max(8, "Key maksimal 8 karakter.")
  .regex(
    /^$|^[A-G][#b]?(m|maj|min|sus|dim|aug|\d)*$/i,
    "Format key tidak valid (cth. D, Bb, F#m).",
  )
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const httpUrl = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(2000, `${label} terlalu panjang.`)
    .refine((v) => /^https?:\/\/.+/i.test(v), `${label} harus http(s).`);

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2000, "URL terlalu panjang.")
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), "URL harus http(s).")
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const songSchema = z.object({
  eventId: z.string().min(1, "Event tidak valid."),
  title: z
    .string()
    .trim()
    .min(2, "Judul minimal 2 karakter.")
    .max(150, "Judul maksimal 150 karakter."),
  artistOrAuthor: z.string().trim().max(150).optional(),
  liturgicalFunction: z.string().trim().max(150).optional(),
  key: musicalKey,
  bpm: z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isNaN(n) ? v : n;
    },
    z
      .number({ message: "BPM harus angka." })
      .int("BPM harus bilangan bulat.")
      .min(30, "BPM minimal 30.")
      .max(300, "BPM maksimal 300.")
      .optional(),
  ),
  timeSignature: z
    .string()
    .trim()
    .max(8)
    .refine((v) => v === "" || /^\d+\/\d+$/.test(v), "Format birama cth. 4/4.")
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  estimatedDurationSeconds: z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isNaN(n) ? v : n;
    },
    z
      .number({ message: "Durasi harus angka." })
      .int()
      .positive("Durasi harus lebih dari 0.")
      .max(3600, "Durasi maksimal 3600 detik.")
      .optional(),
  ),
  originalReferenceUrl: optionalHttpUrl,
  arrangementNotes: z.string().trim().max(5000).optional(),
  status: songStatusSchema,
});

export const batchSchema = z.object({
  eventId: z.string().min(1, "Event tidak valid."),
  name: z
    .string()
    .trim()
    .min(2, "Nama batch minimal 2 karakter.")
    .max(120, "Nama batch maksimal 120 karakter."),
  description: z.string().trim().max(2000).optional(),
  releaseAt: z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const d = v instanceof Date ? v : new Date(String(v));
      return Number.isNaN(d.getTime()) ? v : d;
    },
    z.date({ message: "Tanggal rilis tidak valid." }).optional(),
  ),
  targetReviewAt: z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const d = v instanceof Date ? v : new Date(String(v));
      return Number.isNaN(d.getTime()) ? v : d;
    },
    z.date({ message: "Tanggal target review tidak valid." }).optional(),
  ),
  status: batchStatusSchema,
});

export const assignmentSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  personId: z.string().min(1, "Personel tidak valid."),
  instrumentSkillId: z.string().min(1).optional(),
  assignmentNote: z.string().trim().max(500).optional(),
  isPrimary: z.preprocess(
    (v) => v === true || v === "true" || v === "on",
    z.boolean(),
  ),
});

// Assign sebatch: several personnel (each with own part) applied to
// checked songs of one batch in a single submit (docs/08).
export const batchAssignmentRowSchema = z.object({
  personId: z.string().min(1, "Personel tidak valid."),
  instrumentSkillId: z.string().min(1).optional(),
});

export const batchAssignmentSchema = z
  .object({
    batchId: z.string().min(1, "Batch tidak valid."),
    rows: z
      .array(batchAssignmentRowSchema)
      .min(1, "Tambahkan minimal 1 personel."),
    songIds: z.array(z.string().min(1)).min(1, "Pilih minimal 1 lagu."),
  })
  .refine(
    (v) => new Set(v.rows.map((r) => r.personId)).size === v.rows.length,
    {
      message: "Personel tidak boleh ganda.",
      path: ["rows"],
    },
  );

export const arrangementVersionSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  versionLabel: z
    .string()
    .trim()
    .min(1, "Label versi wajib diisi.")
    .max(20, "Label versi maksimal 20 karakter.")
    .regex(/^[A-Za-z0-9._-]+$/, "Label versi hanya huruf, angka, titik, strip."),
  changeSummary: z
    .string()
    .trim()
    .min(3, "Ringkasan perubahan minimal 3 karakter.")
    .max(2000, "Ringkasan perubahan maksimal 2000 karakter."),
  key: musicalKey,
  bpm: z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isNaN(n) ? v : n;
    },
    z.number().int().min(30).max(300).optional(),
  ),
  grooveNotes: z.string().trim().max(2000).optional(),
  structureNotes: z.string().trim().max(5000).optional(),
  referenceUrl: optionalHttpUrl,
});

export const materialSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  arrangementVersionId: z.string().min(1).optional(),
  title: z
    .string()
    .trim()
    .min(2, "Judul materi minimal 2 karakter.")
    .max(150, "Judul materi maksimal 150 karakter."),
  category: materialCategorySchema,
  url: httpUrl("URL materi"),
  versionLabel: z.string().trim().max(20).optional(),
  description: z.string().trim().max(2000).optional(),
});

export type SongInput = z.infer<typeof songSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type ArrangementVersionInput = z.infer<typeof arrangementVersionSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
