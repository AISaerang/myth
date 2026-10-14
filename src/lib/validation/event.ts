import { z } from "zod";

export const eventStatusSchema = z.enum(
  ["DRAFT", "PENDING_CONFIRMATION", "CONFIRMED", "COMPLETED", "CANCELLED"],
  { message: "Status event tidak valid." },
);

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam harus format HH:mm.");

const optionalUrl = z
  .string()
  .trim()
  .max(2000, "URL terlalu panjang.")
  .refine(
    (v) => v === "" || /^https?:\/\/.+/i.test(v),
    "URL harus diawali http:// atau https://.",
  )
  .transform((v) => (v === "" ? undefined : v))
  .optional();

function toOptionalDate(value: unknown): Date | undefined {
  if (value === "" || value === undefined || value === null) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const baseEventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama acara minimal 3 karakter.")
    .max(120, "Nama acara maksimal 120 karakter."),
  description: z.string().trim().max(2000).optional(),
  eventDate: z.preprocess(toOptionalDate, z.date().optional()),
  startTime: z.preprocess(
    (v) => (v === "" ? undefined : v),
    timeString.optional(),
  ),
  endTime: z.preprocess((v) => (v === "" ? undefined : v), timeString.optional()),
  venue: z.string().trim().max(200).optional(),
  theme: z.string().trim().max(200).optional(),
  targetDurationMinutes: z.preprocess(
    (v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isNaN(n) ? v : n;
    },
    z
      .number({ message: "Durasi harus angka." })
      .int("Durasi harus bilangan bulat.")
      .positive("Durasi harus lebih dari 0.")
      .max(1440, "Durasi maksimal 1440 menit.")
      .optional(),
  ),
  eventStatus: eventStatusSchema,
  liturgicalFlowUrl: optionalUrl,
  committeePicName: z.string().trim().max(100).optional(),
  committeePicContact: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const eventSchema = baseEventSchema.refine(
  (v) => {
    if (v.startTime && v.endTime) return v.endTime > v.startTime;
    return true;
  },
  { message: "Jam selesai harus setelah jam mulai.", path: ["endTime"] },
);

export type EventInput = z.infer<typeof eventSchema>;
