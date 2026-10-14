import type { BatchStatus } from "@/generated/prisma/client";

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Dipublikasi",
  REVIEWING: "Review",
  COMPLETED: "Selesai",
  ARCHIVED: "Arsip",
};

// Allowed batch lifecycle transitions. Publish/unpublish and review
// completion are intentional admin actions, never silent.
const ALLOWED: Record<BatchStatus, BatchStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["REVIEWING", "ARCHIVED"],
  REVIEWING: ["COMPLETED", "PUBLISHED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransitionBatch(from: BatchStatus, to: BatchStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}
