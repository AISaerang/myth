import "server-only";
import { AuditAction, writeAudit } from "@/lib/audit";
import { BASE_KEY, normalizeToC } from "@/lib/chords";
import { prisma } from "@/lib/db";
import type {
  ChordChartInput,
  ChordChartUpdateInput,
} from "@/lib/validation/chord";

export async function listChordCharts(songId: string) {
  return prisma.chordChart.findMany({
    where: { songId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveChordChart(songId: string) {
  return prisma.chordChart.findFirst({
    where: { songId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

// Menyimpan chart baru yang sudah dinormalisasi ke C. Chart lama
// otomatis nonaktif (satu aktif per lagu, transaksional).
export async function saveChordChart(
  actorUserId: string,
  input: ChordChartInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const song = await prisma.song.findUnique({ where: { id: input.songId } });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
  let normalized: string;
  try {
    normalized = normalizeToC(input.content, input.originalKey);
  } catch {
    return { ok: false, error: "Nada dasar asal tidak valid." };
  }
  const chart = await prisma.$transaction(async (tx) => {
    await tx.chordChart.updateMany({
      where: { songId: input.songId },
      data: { isActive: false },
    });
    return tx.chordChart.create({
      data: {
        songId: input.songId,
        content: normalized,
        baseKey: BASE_KEY,
        originalKey: input.originalKey.toUpperCase(),
        label: input.label || null,
        isActive: true,
        createdById: actorUserId,
      },
    });
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHORD_CHART_SAVED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Chord chart "${song.title}" disimpan (basis C, asal ${input.originalKey.toUpperCase()}).`,
    metadata: { song: song.title, originalKey: input.originalKey.toUpperCase() },
  });
  return { ok: true, id: chart.id };
}

// Edit chart yang sudah ada. Konten tetap basis C (tanpa normalisasi ulang),
// sehingga admin bisa memperbaiki chord/lirik langsung tanpa membuat versi baru.
export async function updateChordChart(
  actorUserId: string,
  input: ChordChartUpdateInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const chart = await prisma.chordChart.findUnique({
    where: { id: input.chartId },
    include: { song: { select: { id: true, title: true } } },
  });
  if (!chart) return { ok: false, error: "Chart tidak ditemukan." };
  if (chart.songId !== input.songId) {
    return { ok: false, error: "Chart tidak cocok dengan lagu." };
  }
  await prisma.chordChart.update({
    where: { id: input.chartId },
    data: {
      content: input.content,
      baseKey: BASE_KEY,
      label: input.label || null,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHORD_CHART_UPDATED,
    entityType: "Song",
    entityId: chart.songId,
    summary: `Chord chart "${chart.song.title}" diperbarui${input.label ? ` (${input.label})` : ""}.`,
    metadata: {
      song: chart.song.title,
      chartId: chart.id,
      baseKey: BASE_KEY,
    },
  });
  return { ok: true };
}

export async function setChordChartActive(
  actorUserId: string,
  chartId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const chart = await prisma.chordChart.findUnique({
    where: { id: chartId },
    include: { song: { select: { title: true } } },
  });
  if (!chart) return { ok: false, error: "Chart tidak ditemukan." };
  await prisma.$transaction([
    prisma.chordChart.updateMany({
      where: { songId: chart.songId },
      data: { isActive: false },
    }),
    prisma.chordChart.update({ where: { id: chartId }, data: { isActive: true } }),
  ]);
  await writeAudit({
    actorUserId,
    action: AuditAction.CHORD_CHART_ACTIVATED,
    entityType: "Song",
    entityId: chart.songId,
    summary: `Chord chart "${chart.song.title}" diaktifkan${chart.label ? ` (${chart.label})` : ""}.`,
    metadata: { song: chart.song.title },
  });
  return { ok: true };
}

export async function deleteChordChart(
  chartId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const chart = await prisma.chordChart.findUnique({
    where: { id: chartId },
  });
  if (!chart) return { ok: false, error: "Chart tidak ditemukan." };
  await prisma.chordChart.delete({ where: { id: chartId } });
  return { ok: true };
}
