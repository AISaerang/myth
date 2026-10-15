import { describe, expect, it } from "vitest";
import {
  batchUpdateSchema,
  songSchema,
  songUpdateSchema,
} from "@/lib/validation/song";
import {
  equipmentUpdateSchema,
  rehearsalUpdateSchema,
} from "@/lib/validation/operations";
import { taskSchema } from "@/lib/validation/work";

// Regresi untuk bug "Invalid input: expected string, received undefined"
// pada SEMUA form edit (lagu, batch, task, rehearsal, equipment):
// payload edit tidak mengandung eventId, jadi skema update tidak boleh
// mewajibkannya. Kasus ini harus tetap hijau selamanya.
describe("edit-form payloads validate without eventId", () => {
  // Mensimulasikan FormData form edit: hanya field yang ada di form.
  const songEdit = {
    title: "Hari Terbaik",
    liturgicalFunction: "Pujian pembuka",
    key: "D",
    bpm: "117",
    timeSignature: "4/4",
    estimatedDurationSeconds: "",
    originalReferenceUrl: "",
    arrangementNotes: "Modulasi ke E di chorus.",
    status: "SOURCE_SHARED",
  };

  it("song edit validates (dulu gagal: eventId undefined)", () => {
    expect(songSchema.safeParse(songEdit).success).toBe(false);
    const parsed = songUpdateSchema.safeParse(songEdit);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Hari Terbaik");
      expect(parsed.data.bpm).toBe(117);
      expect(parsed.data.estimatedDurationSeconds).toBeUndefined();
    }
  });

  it("batch edit validates", () => {
    const parsed = batchUpdateSchema.safeParse({
      name: "Batch 1 — Ice Breaking",
      description: "",
      releaseAt: "",
      targetReviewAt: "",
      status: "DRAFT",
    });
    expect(parsed.success).toBe(true);
  });

  it("task edit validates with hidden eventId from the form", () => {
    const parsed = taskSchema.safeParse({
      eventId: "e1",
      title: "Siapkan click",
      status: "TODO",
      priority: "HIGH",
    });
    expect(parsed.success).toBe(true);
  });

  it("rehearsal edit validates", () => {
    const parsed = rehearsalUpdateSchema.safeParse({
      title: "Monitoring Batch 1",
      type: "ONLINE_MONITORING",
      startsAt: "2026-11-10T19:00",
      status: "SCHEDULED",
    });
    expect(parsed.success).toBe(true);
  });

  it("equipment edit validates", () => {
    const parsed = equipmentUpdateSchema.safeParse({
      name: "Kabel XLR",
      category: "Kabel",
      status: "NEEDED",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.quantity).toBe(1);
  });
});
