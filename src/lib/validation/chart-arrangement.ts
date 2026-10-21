import { z } from "zod";
import { CHART_SECTION_TYPES } from "@/lib/chart-arrangement";

const songId = z.string().min(1, "Lagu tidak valid.");

const sectionType = z.enum(CHART_SECTION_TYPES, {
  message: "Tipe bagian tidak valid.",
});

const sectionLabel = z
  .string()
  .trim()
  .min(1, "Label bagian wajib diisi.")
  .max(50, "Label bagian maksimal 50 karakter.");

const sectionContent = z
  .string()
  .trim()
  .min(1, "Konten bagian wajib diisi.")
  .max(20000, "Konten bagian maksimal 20000 karakter.")
  .refine(
    (v) => !/^\s*\{[^}]+\}\s*$/.test(v),
    "Label bagian diisi di kolom label, bukan {...} di konten.",
  );

export const chartSectionCreateSchema = z.object({
  songId,
  type: sectionType,
  label: sectionLabel,
  content: sectionContent,
});

export const chartSectionUpdateSchema = z.object({
  songId,
  sectionId: z.string().min(1, "Bagian tidak valid."),
  type: sectionType,
  label: sectionLabel,
  content: sectionContent,
});

export const chartSectionDeleteSchema = z.object({
  songId,
  sectionId: z.string().min(1, "Bagian tidak valid."),
});

const arrangementName = z
  .string()
  .trim()
  .min(1, "Nama aransemen wajib diisi.")
  .max(60, "Nama aransemen maksimal 60 karakter.");

export const chartArrangementCreateSchema = z.object({
  songId,
  name: arrangementName,
});

export const chartArrangementUpdateSchema = z.object({
  songId,
  arrangementId: z.string().min(1, "Aransemen tidak valid."),
  name: arrangementName,
});

export const chartArrangementDeleteSchema = z.object({
  songId,
  arrangementId: z.string().min(1, "Aransemen tidak valid."),
});

export const chartArrangementActivateSchema = z.object({
  songId,
  arrangementId: z.string().min(1, "Aransemen tidak valid."),
});

export const chartArrangementItemSchema = z.object({
  sectionId: z.string().min(1, "Bagian tidak valid."),
  labelOverride: z.string().trim().max(50).optional().nullable(),
});

export const chartArrangementItemsSchema = z.object({
  songId,
  arrangementId: z.string().min(1, "Aransemen tidak valid."),
  items: z
    .array(chartArrangementItemSchema)
    .min(1, "Aransemen minimal punya satu bagian.")
    .max(100, "Aransemen maksimal 100 item."),
});

export const legacyChartImportSchema = z.object({
  songId,
  name: arrangementName.optional(),
});

export type ChartSectionCreateInput = z.infer<typeof chartSectionCreateSchema>;
export type ChartSectionUpdateInput = z.infer<typeof chartSectionUpdateSchema>;
export type ChartArrangementCreateInput = z.infer<
  typeof chartArrangementCreateSchema
>;
export type ChartArrangementUpdateInput = z.infer<
  typeof chartArrangementUpdateSchema
>;
export type ChartArrangementItemsInput = z.infer<
  typeof chartArrangementItemsSchema
>;
