import { z } from "zod";
import { parseJakartaLocalInput } from "@/lib/datetime-local";

export const practiceStatusSchema = z.enum(
  [
    "NOT_STARTED",
    "LEARNING",
    "TRIED_WITH_REFERENCE",
    "NEEDS_HELP",
    "READY_FOR_REHEARSAL",
  ],
  { message: "Status progres tidak valid." },
);

export const taskStatusSchema = z.enum(
  ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"],
  { message: "Status task tidak valid." },
);

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
  message: "Prioritas tidak valid.",
});

export const progressSchema = z.object({
  songId: z.string().min(1, "Lagu tidak valid."),
  status: practiceStatusSchema,
  note: z.string().trim().max(1000, "Catatan maksimal 1000 karakter.").optional(),
});

const optionalDateTime = z.preprocess(
  (v) => {
    if (v === "" || v === undefined || v === null) return undefined;
    const d = v instanceof Date ? v : parseJakartaLocalInput(String(v));
    return Number.isNaN(d.getTime()) ? v : d;
  },
  z.date({ message: "Tanggal tidak valid." }).optional(),
);

export const taskSchema = z
  .object({
    eventId: z.string().min(1, "Event tidak valid."),
    title: z
      .string()
      .trim()
      .min(3, "Judul minimal 3 karakter.")
      .max(150, "Judul maksimal 150 karakter."),
    description: z.string().trim().max(2000).optional(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    dueAt: optionalDateTime,
    assigneePersonId: z.string().min(1).optional(),
    relatedSongId: z.string().min(1).optional(),
    relatedRehearsalId: z.string().min(1).optional(),
  })
  // Blocker wajib punya owner + tindak lanjut (docs/01-PRD.md).
  .refine((v) => v.status !== "BLOCKED" || v.assigneePersonId, {
    message: "Task blocked wajib punya PIC.",
    path: ["assigneePersonId"],
  })
  .refine((v) => v.status !== "BLOCKED" || (v.description ?? "").trim().length >= 10, {
    message: "Task blocked wajib ada tindak lanjut (min. 10 karakter).",
    path: ["description"],
  });

export const taskStatusUpdateSchema = z.object({
  status: taskStatusSchema,
});

// Usulan dari USER/OBSERVER (docs/11: dimoderasi MD).
// Client hanya boleh mengisi judul + deskripsi + relasi lagu/rehearsal.
// Status dipaksa TODO, prioritas dibatasi LOW/MEDIUM, tanpa PIC/tenggat —
// MD yang melengkapi saat moderasi. Minimal 10 karakter deskripsi agar
// usulan teknis per part bisa ditindaklanjuti.
export const suggestionSchema = z.object({
  eventId: z.string().min(1, "Event tidak valid."),
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter.")
    .max(150, "Judul maksimal 150 karakter."),
  description: z
    .string()
    .trim()
    .min(10, "Jelaskan usulan minimal 10 karakter.")
    .max(2000, "Usulan maksimal 2000 karakter."),
  relatedSongId: z.string().min(1).optional(),
  relatedRehearsalId: z.string().min(1).optional(),
});

export type ProgressInput = z.infer<typeof progressSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type SuggestionInput = z.infer<typeof suggestionSchema>;
