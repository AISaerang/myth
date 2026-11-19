import { z } from "zod";
import { ARRANGEMENT_ROLE_CATALOG } from "@/lib/arrangement-roles";
import { INSTRUMENT_DYNAMIC_VALUES } from "@/lib/validation/instrument-chart";

export const arrangementRoleSlugSchema = z.enum(
  ARRANGEMENT_ROLE_CATALOG.map((role) => role.slug),
);

const roleSectionSchema = z.object({
  notes: z.string().trim().max(5000).optional(),
  pattern: z.string().trim().max(80).optional(),
  dynamic: z.enum(INSTRUMENT_DYNAMIC_VALUES).optional(),
  content: z.string().trim().max(20000).optional(),
});

export const arrangementRoleDataSchema = z.object({
  sections: z.record(z.string(), roleSectionSchema).optional().default({}),
});

export const saveArrangementRoleTabSchema = z.object({
  songId: z.string().min(1),
  arrangementId: z.string().min(1),
  role: arrangementRoleSlugSchema,
  data: arrangementRoleDataSchema,
});
