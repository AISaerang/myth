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

export async function getInstrumentChart(arrangementId: string) {
  const [record, arrangement] = await Promise.all([
    prisma.songInstrumentChart.findUnique({ where: { arrangementId } }),
    prisma.chartArrangement.findUnique({
      where: { id: arrangementId },
      select: { songId: true },
    }),
  ]);
  if (!arrangement) {
    return {
      capo: 0,
      data: instrumentChartDataSchema.parse(EMPTY_DATA),
    };
  }
  const sectionRows = await prisma.chartSection.findMany({
    where: { songId: arrangement.songId },
    select: { id: true },
  });
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

export async function getInstrumentChartForSong(songId: string) {
  const arrangement = await prisma.chartArrangement.findFirst({
    where: { songId, isActive: true },
    select: { id: true },
  });
  if (!arrangement) {
    return {
      capo: 0,
      data: instrumentChartDataSchema.parse(EMPTY_DATA),
    };
  }
  return getInstrumentChart(arrangement.id);
}

export async function upsertInstrumentChart(
  actorUserId: string,
  arrangementId: string,
  input: InstrumentChartInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const arrangement = await prisma.chartArrangement.findUnique({
    where: { id: arrangementId },
    include: { song: { select: { id: true, title: true } } },
  });
  if (!arrangement) {
    return { ok: false, error: "Aransemen tidak ditemukan." };
  }
  if (
    input.songId !== arrangement.songId ||
    input.arrangementId !== arrangementId
  ) {
    return { ok: false, error: "Data instrumen tidak cocok dengan aransemen." };
  }

  const sectionIds = Object.keys(input.data.sections);
  if (sectionIds.length > 0) {
    const ownedSections = await prisma.chartSection.findMany({
      where: { songId: arrangement.songId, id: { in: sectionIds } },
      select: { id: true },
    });
    if (ownedSections.length !== sectionIds.length) {
      return { ok: false, error: "Data bagian instrumen tidak valid." };
    }
  }

  await prisma.songInstrumentChart.upsert({
    where: { arrangementId },
    create: {
      songId: arrangement.songId,
      arrangementId,
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
    entityType: "ChartArrangement",
    entityId: arrangementId,
    summary: `Data instrumen "${arrangement.song.title}" untuk aransemen "${arrangement.name}" diperbarui.`,
    metadata: {
      song: arrangement.song.title,
      arrangement: arrangement.name,
      capo: String(input.capo),
      sections: String(sectionIds.length),
      voicings: String(Object.keys(input.data.voicings).length),
    },
  });
  return { ok: true };
}
