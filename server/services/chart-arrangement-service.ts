import "server-only";
import { AuditAction, writeAudit } from "@/lib/audit";
import {
  composeArrangementContent,
  displaySectionLabel,
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
  LyricsChartImportInput,
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
): Promise<{
  name: string;
  content: string;
  defaultKey: string | null;
  sections: {
    id: string;
    label: string;
    content: string;
    modulationSemitones: number;
  }[];
} | null> {
  return getEventArrangementContent({ songId, eventId: null });
}

export async function getEventArrangementContent({
  songId,
  eventId,
}: {
  songId: string;
  eventId: string | null;
}): Promise<{
  name: string;
  content: string;
  defaultKey: string | null;
  sections: {
    id: string;
    label: string;
    content: string;
    modulationSemitones: number;
  }[];
} | null> {
  let arrangementId: string | null = null;
  if (eventId) {
    const eventSong = await prisma.eventSong.findUnique({
      where: { eventId_songId: { eventId, songId } },
      select: { chartArrangementId: true },
    });
    arrangementId = eventSong?.chartArrangementId ?? null;
  }
  const active = arrangementId
    ? await prisma.chartArrangement.findUnique({
        where: { id: arrangementId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: { section: true },
          },
        },
      })
    : await prisma.chartArrangement.findFirst({
        where: { songId, isActive: true },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: { section: true },
          },
        },
      });
  if (!active || active.songId !== songId) return null;
  if (!active || active.items.length === 0) return null;
  const content = composeArrangementContent(active.items);
  if (!content) return null;
  const sections = active.items
    .map((item) => ({
      id: item.section.id,
      label: displaySectionLabel(
        item.labelOverride?.trim() || item.section.label,
        {
          type: item.section.type,
          content: item.section.content,
        },
      ),
      content: item.section.content.trim(),
      modulationSemitones: item.modulationSemitones,
    }))
    .filter((section) => Boolean(section.content));
  return {
    name: active.name,
    content,
    defaultKey: active.defaultKey,
    sections,
  };
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
    data: {
      name: input.name,
      defaultKey: input.defaultKey?.trim() || null,
    },
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
        modulationSemitones: item.modulationSemitones,
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

export async function importLyricsChart(
  actorUserId: string,
  input: LyricsChartImportInput,
): Promise<Result> {
  const song = await prisma.song.findUnique({
    where: { id: input.songId },
    select: { id: true, title: true },
  });
  if (!song) return { ok: false, error: "Lagu tidak ditemukan." };

  const [sectionCount, arrangementCount] = await Promise.all([
    prisma.chartSection.count({ where: { songId: input.songId } }),
    prisma.chartArrangement.count({ where: { songId: input.songId } }),
  ]);
  if (sectionCount > 0 || arrangementCount > 0) {
    return {
      ok: false,
      error:
        "Lagu sudah punya bagian/aransemen. Import hanya untuk lagu yang belum dimigrasi.",
    };
  }

  const sectionLabels = new Set<string>();
  for (const section of input.sections) {
    if (sectionLabels.has(section.label)) {
      return {
        ok: false,
        error: `Label bagian "${section.label}" duplikat.`,
      };
    }
    sectionLabels.add(section.label);
  }
  for (const item of input.items) {
    if (!sectionLabels.has(item.label)) {
      return {
        ok: false,
        error: `Bagian "${item.label}" tidak ada di daftar bagian.`,
      };
    }
  }

  const name = input.name?.trim() || "Aransemen Utama";
  const result = await prisma.$transaction(async (tx) => {
    const sectionIds = new Map<string, string>();
    for (const [index, section] of input.sections.entries()) {
      const created = await tx.chartSection.create({
        data: {
          songId: input.songId,
          type: section.type,
          label: section.label,
          content: section.content,
          sortOrder: index,
          createdById: actorUserId,
        },
      });
      sectionIds.set(section.label, created.id);
    }

    const arrangement = await tx.chartArrangement.create({
      data: {
        songId: input.songId,
        name,
        isActive: true,
        createdById: actorUserId,
      },
    });
    await tx.chartArrangementItem.createMany({
      data: input.items.map((item, index) => ({
        arrangementId: arrangement.id,
        sectionId: sectionIds.get(item.label) as string,
        sortOrder: index,
        labelOverride: item.labelOverride?.trim() || null,
      })),
    });
    return { arrangementId: arrangement.id };
  }, { timeout: 30_000 });

  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_LYRICS_IMPORTED,
    entityType: "Song",
    entityId: input.songId,
    summary: `Lirik "${song.title}" diimpor menjadi ${input.sections.length} bagian + aransemen "${name}".`,
    metadata: {
      song: song.title,
      sections: String(input.sections.length),
      arrangement: name,
    },
  });
  return { ok: true, id: result.arrangementId };
}

export async function duplicateChartArrangement(
  actorUserId: string,
  arrangementId: string,
  newName: string,
  eventId: string | null = null,
): Promise<Result> {
  const source = await prisma.chartArrangement.findUnique({
    where: { id: arrangementId },
    include: {
      song: { select: { id: true, title: true } },
      items: {
        orderBy: { sortOrder: "asc" },
      },
      instrumentChart: true,
      roleTabs: true,
    },
  });
  if (!source) return { ok: false, error: "Aransemen tidak ditemukan." };
  const duplicateName = await prisma.chartArrangement.findFirst({
    where: { songId: source.songId, name: newName },
    select: { id: true },
  });
  if (duplicateName) {
    return { ok: false, error: "Nama aransemen sudah dipakai lagu ini." };
  }

  const copy = await prisma.$transaction(async (tx) => {
    const created = await tx.chartArrangement.create({
      data: {
        songId: source.songId,
        name: newName,
        defaultKey: source.defaultKey,
        isActive: false,
        createdById: actorUserId,
      },
    });
    await tx.chartArrangementItem.createMany({
      data: source.items.map((item) => ({
        arrangementId: created.id,
        sectionId: item.sectionId,
        sortOrder: item.sortOrder,
        labelOverride: item.labelOverride,
        modulationSemitones: item.modulationSemitones,
      })),
    });
    if (source.instrumentChart) {
      await tx.songInstrumentChart.create({
        data: {
          songId: source.songId,
          arrangementId: created.id,
          capo: source.instrumentChart.capo,
          data: source.instrumentChart.data as object,
          updatedById: actorUserId,
        },
      });
    }
    if (source.roleTabs.length > 0) {
      await tx.arrangementRoleTab.createMany({
        data: source.roleTabs.map((tab) => ({
          arrangementId: created.id,
          role: tab.role,
          data: tab.data as object,
          updatedById: actorUserId,
        })),
      });
    }
    if (eventId) {
      await tx.eventSong.updateMany({
        where: { eventId, songId: source.songId },
        data: { chartArrangementId: created.id },
      });
    }
    return created;
  });

  await writeAudit({
    actorUserId,
    action: AuditAction.CHART_ARRANGEMENT_DUPLICATED,
    entityType: "ChartArrangement",
    entityId: copy.id,
    summary: `Aransemen "${source.name}" diduplikasi menjadi "${newName}" untuk "${source.song.title}".`,
    metadata: {
      song: source.song.title,
      sourceArrangementId: source.id,
      eventId: eventId ?? "",
    },
  });
  return { ok: true, id: copy.id };
}

export async function setEventSongArrangement(
  actorUserId: string,
  eventId: string,
  songId: string,
  arrangementId: string,
): Promise<SimpleResult> {
  const [eventSong, arrangement] = await Promise.all([
    prisma.eventSong.findUnique({
      where: { eventId_songId: { eventId, songId } },
      select: { id: true },
    }),
    prisma.chartArrangement.findUnique({
      where: { id: arrangementId },
      select: { id: true, songId: true, name: true },
    }),
  ]);
  if (!eventSong) return { ok: false, error: "Lagu tidak ada di event ini." };
  if (!arrangement || arrangement.songId !== songId) {
    return { ok: false, error: "Aransemen tidak cocok dengan lagu event ini." };
  }
  await prisma.eventSong.update({
    where: { eventId_songId: { eventId, songId } },
    data: { chartArrangementId: arrangement.id },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.EVENT_SONG_ARRANGEMENT_SELECTED,
    entityType: "EventSong",
    entityId: `${eventId}:${songId}`,
    summary: `Aransemen "${arrangement.name}" dipakai untuk lagu pada event.`,
    metadata: { eventId, songId, arrangementId: arrangement.id },
  });
  return { ok: true };
}

export async function saveArrangementRoleTab(
  actorUserId: string,
  input: {
    songId: string;
    arrangementId: string;
    role: string;
    data: unknown;
  },
): Promise<SimpleResult> {
  const arrangement = await prisma.chartArrangement.findUnique({
    where: { id: input.arrangementId },
    select: { id: true, songId: true, name: true },
  });
  if (!arrangement) return { ok: false, error: "Aransemen tidak ditemukan." };
  if (arrangement.songId !== input.songId) {
    return { ok: false, error: "Tab peran tidak cocok dengan lagu." };
  }
  await prisma.arrangementRoleTab.upsert({
    where: {
      arrangementId_role: {
        arrangementId: input.arrangementId,
        role: input.role,
      },
    },
    create: {
      arrangementId: input.arrangementId,
      role: input.role,
      data: input.data as object,
      updatedById: actorUserId,
    },
    update: {
      data: input.data as object,
      updatedById: actorUserId,
    },
  });
  await writeAudit({
    actorUserId,
    action: AuditAction.ARRANGEMENT_ROLE_TAB_SAVED,
    entityType: "ChartArrangement",
    entityId: input.arrangementId,
    summary: `Tab peran "${input.role}" untuk aransemen "${arrangement.name}" diperbarui.`,
    metadata: { songId: input.songId, role: input.role },
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
  }, { timeout: 30_000 });

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
