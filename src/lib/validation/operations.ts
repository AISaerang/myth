import { z } from "zod";

export const rehearsalTypeSchema = z.enum(
  [
    "ONLINE_MONITORING",
    "ONSITE_SECTIONAL",
    "FULL_REHEARSAL",
    "TECHNICAL_REHEARSAL",
    "EVENT_DAY_SOUNDCHECK",
    "OTHER",
  ],
  { message: "Tipe rehearsal tidak valid." },
);

export const rehearsalStatusSchema = z.enum(
  ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"],
  { message: "Status rehearsal tidak valid." },
);

export const attendanceStatusSchema = z.enum(
  ["EXPECTED", "PRESENT", "ABSENT", "LATE", "EXCUSED"],
  { message: "Status kehadiran tidak valid." },
);

export const equipmentStatusSchema = z.enum(
  ["NOT_CHECKED", "NEEDED", "CONFIRMED", "TESTED", "BLOCKED", "NOT_APPLICABLE"],
  { message: "Status equipment tidak valid." },
);

export const decisionTypeSchema = z.enum(
  ["MUSICAL", "EVENT", "TECHNICAL", "PERSONNEL", "OTHER"],
  { message: "Tipe keputusan tidak valid." },
);

const requiredDateTime = z.preprocess(
  (v) => {
    if (v instanceof Date) return v;
    if (typeof v === "string" && v !== "") {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? v : d;
    }
    return v;
  },
  z.date({ message: "Waktu tidak valid." }),
);

const optionalDateTime = z.preprocess(
  (v) => {
    if (v === "" || v === undefined || v === null) return undefined;
    if (v instanceof Date) return v;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? v : d;
  },
  z.date({ message: "Waktu tidak valid." }).optional(),
);

export const rehearsalSchema = z
  .object({
    eventId: z.string().min(1, "Event tidak valid."),
    title: z
      .string()
      .trim()
      .min(3, "Judul minimal 3 karakter.")
      .max(150, "Judul maksimal 150 karakter."),
    type: rehearsalTypeSchema,
    startsAt: requiredDateTime,
    endsAt: optionalDateTime,
    venueOrMeetingUrl: z.string().trim().max(500).optional(),
    agenda: z.string().trim().max(5000).optional(),
    status: rehearsalStatusSchema,
    notes: z.string().trim().max(5000).optional(),
  })
  .refine(
    (v) => !v.endsAt || v.endsAt.getTime() > v.startsAt.getTime(),
    { message: "Waktu selesai harus setelah waktu mulai.", path: ["endsAt"] },
  );

export const attendanceSchema = z.object({
  rehearsalId: z.string().min(1, "Rehearsal tidak valid."),
  personId: z.string().min(1, "Personel tidak valid."),
  status: attendanceStatusSchema,
  note: z.string().trim().max(500).optional(),
});

export const equipmentSchema = z
  .object({
    eventId: z.string().min(1, "Event tidak valid."),
    name: z
      .string()
      .trim()
      .min(2, "Nama item minimal 2 karakter.")
      .max(150, "Nama item maksimal 150 karakter."),
    category: z
      .string()
      .trim()
      .min(2, "Kategori minimal 2 karakter.")
      .max(100, "Kategori maksimal 100 karakter."),
    quantity: z.preprocess(
      (v) => {
        if (v === "" || v === undefined || v === null) return 1;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isNaN(n) ? v : n;
      },
      z
        .number({ message: "Jumlah harus angka." })
        .int("Jumlah harus bilangan bulat.")
        .min(1, "Jumlah minimal 1.")
        .max(999, "Jumlah maksimal 999."),
    ),
    status: equipmentStatusSchema,
    ownerOrSource: z.string().trim().max(200).optional(),
    assigneePersonId: z.string().min(1).optional(),
    dueAt: optionalDateTime,
    notes: z.string().trim().max(2000).optional(),
  })
  // Blocker teknis wajib punya PIC (docs/00 indikator sukses).
  .refine((v) => v.status !== "BLOCKED" || v.assigneePersonId, {
    message: "Equipment blocked wajib punya PIC.",
    path: ["assigneePersonId"],
  });

export const decisionSchema = z.object({
  eventId: z.string().min(1, "Event tidak valid."),
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter.")
    .max(150, "Judul maksimal 150 karakter."),
  decisionType: decisionTypeSchema,
  decisionText: z
    .string()
    .trim()
    .min(3, "Isi keputusan minimal 3 karakter.")
    .max(5000, "Isi keputusan maksimal 5000 karakter."),
  reason: z.string().trim().max(2000).optional(),
  decidedBy: z.string().trim().max(100).optional(),
  relatedSongId: z.string().min(1).optional(),
  relatedRehearsalId: z.string().min(1).optional(),
});

export type RehearsalInput = z.infer<typeof rehearsalSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
