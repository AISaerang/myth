"use server";

import { revalidatePath } from "next/cache";
import { requireActionUser } from "@/lib/auth";
import { firstIssueMessage } from "@/lib/validation/auth";
import { instrumentChartInputSchema } from "@/lib/validation/instrument-chart";
import { upsertInstrumentChart } from "@server/services/instrument-chart-service";
import type { ActionState } from "./auth";
import {
  optionalEventId,
  requireSongContentEditor,
} from "./event-authorization";

export async function saveInstrumentChartAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  let data: unknown;
  try {
    data = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    return { ok: false, error: "Data instrumen tidak valid." };
  }
  const parsed = instrumentChartInputSchema.safeParse({
    songId: formData.get("songId"),
    arrangementId: formData.get("arrangementId"),
    capo:
      typeof formData.get("capo") === "string" &&
      String(formData.get("capo")).trim() !== ""
        ? Number(formData.get("capo"))
        : Number.NaN,
    data,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  await requireSongContentEditor(
    user,
    parsed.data.songId,
    optionalEventId(formData.get("eventId")),
    { kind: "instrumentChart", id: parsed.data.arrangementId },
  );
  const result = await upsertInstrumentChart(
    user.id,
    parsed.data.arrangementId,
    parsed.data,
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/songs/${parsed.data.songId}`);
  revalidatePath(`/songs/${parsed.data.songId}/chart`);
  return { ok: true };
}
