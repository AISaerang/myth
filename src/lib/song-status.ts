import type { SongStatus } from "@/generated/prisma/client";

// Readiness pipeline order (docs/08-MUSIC-WORKFLOW.md). Draft data must
// never look final: anything before READY_FOR_REHEARSAL is "in progress".
export const SONG_STATUS_ORDER: SongStatus[] = [
  "DRAFT",
  "SOURCE_SHARED",
  "ARRANGEMENT_IN_PROGRESS",
  "REFERENCE_READY",
  "PRACTICING",
  "NEEDS_REVIEW",
  "READY_FOR_REHEARSAL",
  "REHEARSAL_READY",
  "FINAL_LOCKED",
];

export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  DRAFT: "Draft",
  SOURCE_SHARED: "Sumber dibagikan",
  ARRANGEMENT_IN_PROGRESS: "Aransemen berjalan",
  REFERENCE_READY: "Referensi siap",
  PRACTICING: "Latihan mandiri",
  NEEDS_REVIEW: "Perlu review",
  READY_FOR_REHEARSAL: "Siap rehearsal",
  REHEARSAL_READY: "Lolos rehearsal",
  FINAL_LOCKED: "Final terkunci",
};

export type SongStatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export function songStatusTone(status: SongStatus): SongStatusTone {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "SOURCE_SHARED":
    case "ARRANGEMENT_IN_PROGRESS":
    case "REFERENCE_READY":
    case "PRACTICING":
      return "info";
    case "NEEDS_REVIEW":
      return "warning";
    case "READY_FOR_REHEARSAL":
    case "REHEARSAL_READY":
      return "success";
    case "FINAL_LOCKED":
      return "success";
  }
}

// Final lock is terminal for normal edits; only an explicit,
// audited unlock may reopen a song.
export function isTerminalSongStatus(status: SongStatus): boolean {
  return status === "FINAL_LOCKED";
}

export function compareSongStatus(a: SongStatus, b: SongStatus): number {
  return SONG_STATUS_ORDER.indexOf(a) - SONG_STATUS_ORDER.indexOf(b);
}
