import type { PracticeStatus } from "@/generated/prisma/client";

export const PRACTICE_STATUS_LABEL: Record<PracticeStatus, string> = {
  NOT_STARTED: "Belum mulai",
  LEARNING: "Sedang dipelajari",
  TRIED_WITH_REFERENCE: "Sudah coba dengan referensi",
  NEEDS_HELP: "Perlu bantuan",
  READY_FOR_REHEARSAL: "Siap rehearsal",
};

export const PRACTICE_STATUS_ORDER: PracticeStatus[] = [
  "NOT_STARTED",
  "LEARNING",
  "TRIED_WITH_REFERENCE",
  "NEEDS_HELP",
  "READY_FOR_REHEARSAL",
];

// NEEDS_HELP is the escalation state: always surfaced to the MD.
export function isHelpNeeded(status: PracticeStatus): boolean {
  return status === "NEEDS_HELP";
}
