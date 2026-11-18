// Shared shape for catatan part (dipakai server service dan client UI).
export type SongNoteStatus = "OPEN" | "RESOLVED";

export interface SongNoteView {
  id: string;
  eventSongId: string;
  sectionId: string | null;
  sectionLabel: string | null;
  parentId: string | null;
  authorUserId: string;
  authorName: string;
  partLabel: string | null;
  targetInstrumentSkillId: string | null;
  targetInstrumentSkillName: string | null;
  body: string;
  status: SongNoteStatus;
  resolvedAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
  replies: SongNoteView[];
}

export const NOTE_STATUS_LABEL: Record<SongNoteStatus, string> = {
  OPEN: "Terbuka",
  RESOLVED: "Selesai",
};

// Catatan tanpa bagian tetap punya label yang ramah di UI.
export const NO_SECTION_LABEL = "Lagu (umum)";

export interface SongNoteTargetOption {
  id: string;
  name: string;
}
