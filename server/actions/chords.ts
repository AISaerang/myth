"use server";

import { revalidatePath } from "next/cache";
import { requireActionUser } from "@/lib/auth";
import { firstIssueMessage } from "@/lib/validation/auth";
import {
  chordChartSchema,
  chordChartUpdateSchema,
} from "@/lib/validation/chord";
import {
  deleteChordChart,
  saveChordChart,
  setChordChartActive,
  updateChordChart,
} from "@server/services/chord-service";
import type { ActionState } from "./auth";
import {
  optionalEventId,
  requireSongContentEditor,
} from "./event-authorization";

function revalidateSong(songId?: string): void {
  revalidatePath("/songs");
  if (songId) revalidatePath(`/songs/${songId}`);
}

export async function saveChordChartAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const parsed = chordChartSchema.safeParse({
    songId: formData.get("songId"),
    content: formData.get("content"),
    originalKey: formData.get("originalKey"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  await requireSongContentEditor(
    user,
    parsed.data.songId,
    optionalEventId(formData.get("eventId")),
  );
  const result = await saveChordChart(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function updateChordChartAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const parsed = chordChartUpdateSchema.safeParse({
    songId: formData.get("songId"),
    chartId: formData.get("chartId"),
    content: formData.get("content"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) };
  }
  await requireSongContentEditor(
    user,
    parsed.data.songId,
    optionalEventId(formData.get("eventId")),
    { kind: "chordChart", id: parsed.data.chartId },
  );
  const result = await updateChordChart(user.id, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(parsed.data.songId);
  return { ok: true };
}

export async function setChordChartActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const chartId = String(formData.get("chartId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!chartId || !songId) return { ok: false, error: "Chart tidak valid." };
  await requireSongContentEditor(
    user,
    songId,
    optionalEventId(formData.get("eventId")),
    { kind: "chordChart", id: chartId },
  );
  const result = await setChordChartActive(user.id, chartId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(songId);
  return { ok: true };
}

export async function deleteChordChartAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireActionUser();
  const chartId = String(formData.get("chartId") ?? "");
  const songId = String(formData.get("songId") ?? "");
  if (!chartId || !songId) return { ok: false, error: "Chart tidak valid." };
  await requireSongContentEditor(
    user,
    songId,
    optionalEventId(formData.get("eventId")),
    { kind: "chordChart", id: chartId },
  );
  const result = await deleteChordChart(chartId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidateSong(songId);
  return { ok: true };
}
