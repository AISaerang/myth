import type { MaterialCategory } from "@/generated/prisma/client";

export const MATERIAL_CATEGORY_LABEL: Record<MaterialCategory, string> = {
  ORIGINAL: "Original",
  ARRANGEMENT_REFERENCE: "Referensi aransemen",
  PART_GUIDE: "Panduan part",
  CHORD_CHART: "Chord chart",
  LYRICS: "Lirik",
  CLICK_CUE: "Click/cue",
  SEQUENCER: "Sequencer",
  REHEARSAL_RECORDING: "Rekaman rehearsal",
  FINAL_ASSET: "Aset final",
  OTHER: "Lainnya",
};
