import "server-only";
import { AuditAction, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  filterExistingInstrumentSections,
  instrumentChartDataSchema,
  instrumentChartInputSchema,
  type InstrumentChartInput,
} from "@/lib/validation/instrument-chart";

const EMPTY_DATA = { sections: {}, voicings: {} };

export async function getInstrumentChart(songId: string) {
  const [record, sectionRows] = await Promise.all([
    prisma.songInstrumentChart.findUnique({ where: { songId } }),
    prisma.chartSection.findMany({
      where: { songId },
      select: { id: true },
    }),
  ]);
  if (!record) {
    return {
      capo: 0,
      data: instrumentChartDataSchema.parse(EMPTY_DATA),
    };
  }
  const parsed = instrumentChartDataSchema.parse(record.data);
  const capo = instrumentChartInputSchema.shape.capo.parse(record.capo);
  const currentSectionIds = new Set(sectionRows.map((section) => section.id));
  return {
    capo,
    data: filterExistingInstrumentSections(parsed, currentSectionIds),
  };
}

export async function upsertInstrumentChart(
  actorUserId: string,
  songId: string,
  input: InstrumentChartInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { id: true, title: true },
  });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };
  if (input.songId !== songId) {
    return { ok: false, error: "Data instrumen tidak cocok dengan lagu." };
  }

  const sectionIds = Object.keys(input.data.sections);
  if (sectionIds.length > 0) {
    const ownedSections = await prisma.chartSection.findMany({
      where: { songId, id: { in: sectionIds } },
      select: { id: true },
    });
    if (ownedSections.length !== sectionIds.length) {
      return { ok: false, error: "Data bagian instrumen tidak valid." };
    }
  }

  await prisma.songInstrumentChart.upsert({
    where: { songId },
    create: {
      songId,
      capo: input.capo,
      data: input.data,
      updatedById: actorUserId,
    },
    update: {
      capo: input.capo,
      data: input.data,
      updatedById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.SONG_INSTRUMENT_CHART_UPDATED,
    entityType: "Song",
    entityId: songId,
    summary: `Data instrumen "${song.title}" diperbarui.`,
    metadata: {
      song: song.title,
      capo: String(input.capo),
      sections: String(sectionIds.length),
      voicings: String(Object.keys(input.data.voicings).length),
    },
  });
  return { ok: true };
}
