import "server-only";
import { AuditAction, writeAudit } from "@/lib/audit";
import {
  composeArrangementContent,
  makeUniqueSectionLabel,
  parseLegacyChart,
} from "@/lib/chart-arrangement";
import { prisma } from "@/lib/db";
import type {
  ChartArrangementCreateInput,
  ChartArrangementItemsInput,
  ChartArrangementUpdateInput,
  ChartSectionCreateInput,
  ChartSectionUpdateInput,
} from "@/lib/validation/chart-arrangement";

type Result =
  | { ok: true; id: string }
  | { ok: false; error: string };

type SimpleResult = { ok: true } | { ok: false; error: string };

export async function listChartSections(songId: string) {
  return prisma.chartSection.findMany({
    where: { songId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function listChartArrangements(songId: string) {
  return prisma.chartArrangement.findMany({
    where: { songId },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { section: true },
      },
    },
  });
}

export async function getChartArrangementContext(songId: string) {
  const [sections, arrangements] = await Promise.all([
    listChartSections(songId),
    listChartArrangements(songId),
  ]);
  return {
    sections,
    arrangements,
    active: arrangements.find((arrangement) => arrangement.isActive) ?? null,
  };
}

export async function getActiveArrangementContent(
  songId: string,
): Promise<{ name: string; content: string } | null> {
  const active = await prisma.chartArrangement.findFirst({
    where: { songId, isActive: true },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { section: true },
      },
    },
  });
  if (!active || active.items.length === 0) return null;
  const content = composeArrangementContent(active.items);
  if (!content) return null;
  return { name: active.name, content };
}

export async function createChartSection(
  actorUserId: string,
  input: ChartSectionCreateInput,
): Promise<Result> {
  const song = await prisma.song.findUnique({
    where: { id: input.songId },
    select: { id: true, title: true },
  });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };

  const duplicate = await prisma.chartSection.findFirst({
    where: { songId: input.songId, label: input.label },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "Label bagian sudah dipakai lagu ini." };
  }

  const last = await prisma.chartSection.findFirst({
    where: { songId: input.songId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const section = await prisma.chartSection.create({
    data: {
      songId: input.songId,
      type: input.type,
      label: input.label,
      content: input.content,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_SECTION_CREATED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Bagian "${input.label}" dibuat untuk "${song.title}".`,
    metadata: { song: song.title, section: input.label, type: input.type },
  });
  return { ok: true, id: section.id };
}

export async function updateChartSection(
  actorUserId: string,
  input: ChartSectionUpdateInput,
): Promise<SimpleResult> {
  const section = await prisma.chartSection.findUnique({
    where: { id: input.sectionId },
    include: { song: { select: { id: true, title: true } } },
  });
  if (!section) return { ok: false, error: "Bagian tidak ditemukan." };
  if (section.songId !== input.songId) {
    return { ok: false, error: "Bagian tidak cocok dengan lagu." };
  }

  const duplicate = await prisma.chartSection.findFirst({
    where: {
      songId: input.songId,
      label: input.label,
      NOT: { id: input.sectionId },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "Label bagian sudah dipakai lagu ini." };
  }

  await prisma.chartSection.update({
    where: { id: input.sectionId },
    data: {
      type: input.type,
      label: input.label,
      content: input.content,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_SECTION_UPDATED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Bagian "${input.label}" diperbarui untuk "${section.song.title}".`,
    metadata: {
      song: section.song.title,
      section: input.label,
      type: input.type,
    },
  });
  return { ok: true };
}

export async function deleteChartSection(
  actorUserId: string,
  songId: string,
  sectionId: string,
): Promise<SimpleResult> {
  const section = await prisma.chartSection.findUnique({
    where: { id: sectionId },
    include: {
      song: { select: { title: true } },
      _count: { select: { items: true } },
    },
  });
  if (!section) return { ok: false, error: "Bagian tidak ditemukan." };
  if (section.songId !== songId) {
    return { ok: false, error: "Bagian tidak cocok dengan lagu." };
  }
  if (section._count.items > 0) {
    return {
      ok: false,
      error: `Bagian masih dipakai di ${section._count.items} item aransemen. Hapus dari aransemen dulu.`,
    };
  }
  await prisma.chartSection.delete({ where: { id: sectionId } });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_SECTION_DELETED,
    entityType: "Song",
    entityId: songId,
    summary: `Bagian "${section.label}" dihapus dari "${section.song.title}".`,
    metadata: { song: section.song.title, section: section.label },
  });
  return { ok: true };
}

export async function createChartArrangement(
  actorUserId: string,
  input: ChartArrangementCreateInput,
): Promise<Result> {
  const song = await prisma.song.findUnique({
    where: { id: input.songId },
    select: { id: true, title: true },
  });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };

  const duplicate = await prisma.chartArrangement.findFirst({
    where: { songId: input.songId, name: input.name },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "Nama aransemen sudah dipakai lagu ini." };
  }

  const count = await prisma.chartArrangement.count({
    where: { songId: input.songId },
  });
  const arrangement = await prisma.chartArrangement.create({
    data: {
      songId: input.songId,
      name: input.name,
      isActive: count === 0,
      createdById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_ARRANGEMENT_CREATED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Aransemen "${input.name}" dibuat untuk "${song.title}".`,
    metadata: { song: song.title, arrangement: input.name },
  });
  return { ok: true, id: arrangement.id };
}

export async function updateChartArrangement(
  actorUserId: string,
  input: ChartArrangementUpdateInput,
): Promise<SimpleResult> {
  const arrangement = await prisma.chartArrangement.findUnique({
    where: { id: input.arrangementId },
    include: { song: { select: { id: true, title: true } } },
  });
  if (!arrangement) return { ok: false, error: "Aransemen tidak ditemukan." };
  if (arrangement.songId !== input.songId) {
    return { ok: false, error: "Aransemen tidak cocok dengan lagu." };
  }

  const duplicate = await prisma.chartArrangement.findFirst({
    where: {
      songId: input.songId,
      name: input.name,
      NOT: { id: input.arrangementId },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "Nama aransemen sudah dipakai lagu ini." };
  }

  await prisma.chartArrangement.update({
    where: { id: input.arrangementId },
    data: { name: input.name },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_ARRANGEMENT_UPDATED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Aransemen "${arrangement.name}" diubah menjadi "${input.name}" untuk "${arrangement.song.title}".`,
    metadata: {
      song: arrangement.song.title,
      from: arrangement.name,
      to: input.name,
    },
  });
  return { ok: true };
}

export async function activateChartArrangement(
  actorUserId: string,
  songId: string,
  arrangementId: string,
): Promise<SimpleResult> {
  const arrangement = await prisma.chartArrangement.findUnique({
    where: { id: arrangementId },
    include: { song: { select: { title: true } } },
  });
  if (!arrangement) return { ok: false, error: "Aransemen tidak ditemukan." };
  if (arrangement.songId !== songId) {
    return { ok: false, error: "Aransemen tidak cocok dengan lagu." };
  }
  await prisma.$transaction([
    prisma.chartArrangement.updateMany({
      where: { songId },
      data: { isActive: false },
    }),
    prisma.chartArrangement.update({
      where: { id: arrangementId },
      data: { isActive: true },
    }),
  ]);
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_ARRANGEMENT_ACTIVATED,
    entityType: "Song",
    entityId: songId,
    summary: `Aransemen "${arrangement.name}" diaktifkan untuk "${arrangement.song.title}".`,
    metadata: { song: arrangement.song.title, arrangement: arrangement.name },
  });
  return { ok: true };
}

export async function deleteChartArrangement(
  actorUserId: string,
  songId: string,
  arrangementId: string,
): Promise<SimpleResult> {
  const arrangement = await prisma.chartArrangement.findUnique({
    where: { id: arrangementId },
    include: { song: { select: { title: true } } },
  });
  if (!arrangement) return { ok: false, error: "Aransemen tidak ditemukan." };
  if (arrangement.songId !== songId) {
    return { ok: false, error: "Aransemen tidak cocok dengan lagu." };
  }
  if (arrangement.isActive) {
    return {
      ok: false,
      error: "Aransemen aktif tidak bisa dihapus. Aktifkan aransemen lain dulu.",
    };
  }
  await prisma.chartArrangement.delete({ where: { id: arrangementId } });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_ARRANGEMENT_DELETED,
    entityType: "Song",
    entityId: songId,
    summary: `Aransemen "${arrangement.name}" dihapus dari "${arrangement.song.title}".`,
    metadata: { song: arrangement.song.title, arrangement: arrangement.name },
  });
  return { ok: true };
}

export async function saveChartArrangementItems(
  actorUserId: string,
  input: ChartArrangementItemsInput,
): Promise<SimpleResult> {
  const arrangement = await prisma.chartArrangement.findUnique({
    where: { id: input.arrangementId },
    include: { song: { select: { title: true } } },
  });
  if (!arrangement) return { ok: false, error: "Aransemen tidak ditemukan." };
  if (arrangement.songId !== input.songId) {
    return { ok: false, error: "Aransemen tidak cocok dengan lagu." };
  }

  const sectionIds = [...new Set(input.items.map((item) => item.sectionId))];
  const sections = await prisma.chartSection.findMany({
    where: { id: { in: sectionIds }, songId: input.songId },
    select: { id: true },
  });
  if (sections.length !== sectionIds.length) {
    return {
      ok: false,
      error: "Ada bagian yang tidak ditemukan atau milik lagu lain.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.chartArrangementItem.deleteMany({
      where: { arrangementId: input.arrangementId },
    });
    await tx.chartArrangementItem.createMany({
      data: input.items.map((item, index) => ({
        arrangementId: input.arrangementId,
        sectionId: item.sectionId,
        sortOrder: index,
        labelOverride: item.labelOverride?.trim() || null,
      })),
    });
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_ARRANGEMENT_ITEMS_SAVED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Urutan aransemen "${arrangement.name}" disimpan (${input.items.length} item) untuk "${arrangement.song.title}".`,
    metadata: {
      song: arrangement.song.title,
      arrangement: arrangement.name,
      items: String(input.items.length),
    },
  });
  return { ok: true };
}

export async function importLegacyChart(
  actorUserId: string,
  songId: string,
  requestedName?: string,
): Promise<Result> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { id: true, title: true },
  });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };

  const [sectionCount, arrangementCount] = await Promise.all([
    prisma.chartSection.count({ where: { songId } }),
    prisma.chartArrangement.count({ where: { songId } }),
  ]);
  if (sectionCount > 0 || arrangementCount > 0) {
    return {
      ok: false,
      error:
        "Lagu sudah punya bagian/aransemen. Import hanya untuk lagu yang belum dimigrasi.",
    };
  }

  const chart = await prisma.chordChart.findFirst({
    where: { songId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!chart) {
    return { ok: false, error: "Tidak ada chord chart aktif untuk diimpor." };
  }

  const parsed = parseLegacyChart(chart.content);
  if (parsed.length === 0) {
    return { ok: false, error: "Chart aktif tidak berisi bagian yang bisa diimpor." };
  }

  const name = requestedName?.trim() || "Aransemen Utama";
  const result = await prisma.$transaction(async (tx) => {
    const usedLabels = new Set<string>();
    const byLabelAndContent = new Map<string, string>();
    const sectionIds: string[] = [];
    let sortOrder = 0;

    for (const part of parsed) {
      const key = `${part.label}\u0000${part.content}`;
      const reusable = byLabelAndContent.get(key);
      if (reusable) {
        sectionIds.push(reusable);
        continue;
      }
      const label = usedLabels.has(part.label)
        ? makeUniqueSectionLabel(part.label, usedLabels)
        : part.label;
      const section = await tx.chartSection.create({
        data: {
          songId,
          type: part.type,
          label,
          content: part.content,
          sortOrder,
          createdById: actorUserId,
        },
      });
      sortOrder += 1;
      usedLabels.add(label);
      byLabelAndContent.set(key, section.id);
      sectionIds.push(section.id);
    }

    const arrangement = await tx.chartArrangement.create({
      data: {
        songId,
        name,
        isActive: true,
        createdById: actorUserId,
      },
    });
    await tx.chartArrangementItem.createMany({
      data: sectionIds.map((sectionId, index) => ({
        arrangementId: arrangement.id,
        sectionId,
        sortOrder: index,
      })),
    });
    return { arrangementId: arrangement.id, sections: sortOrder };
  });

  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_LEGACY_IMPORTED,
    entityType: "Song",
    entityId: songId,
    summary: `Chart lama "${song.title}" diimpor menjadi ${result.sections} bagian + aransemen "${name}".`,
    metadata: {
      song: song.title,
      chartId: chart.id,
      sections: String(result.sections),
      arrangement: name,
    },
  });
  return { ok: true, id: result.arrangementId };
}
