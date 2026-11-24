import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { MedleyJoinedSheet } from "@/app/(app)/batches/MedleyJoinedSheet";
import { groupMedleyRuns, visibleMedleyItems } from "@/lib/medley-groups";
import { requireFreshUser } from "@/lib/auth";
import {
  canManageEvent,
  canWriteEventData,
  isAdmin,
} from "@/lib/permissions";
import { canManageBatchUi, isBatchReadable } from "@/lib/batch-view";
import { UI_MODE_COOKIE, uiModeForEvent } from "@/lib/ui-mode";
import { eventSongDisplayKey } from "@/lib/event-song";
import { displaySectionLabel } from "@/lib/chart-arrangement";
import { prisma } from "@/lib/db";
import { getBatch, listMedleyTransitions } from "@server/services/batch-service";
import { getEventRole } from "@server/services/event-access";
import { getInstrumentChart } from "@server/services/instrument-chart-service";
import { parseLegacyChart } from "@/lib/chart-arrangement";

export default async function JoinedMedleyPage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const user = await requireFreshUser();
  const { id: batchId, groupId: runSlug } = await params;
  const batch = await getBatch(batchId);
  if (!batch) notFound();

  const eventRole = await getEventRole(user, batch.eventId);
  if (!eventRole) notFound();
  const event = await prisma.event.findUnique({
    where: { id: batch.eventId },
    select: { accessClosedAt: true },
  });
  if (!event) notFound();
  const canWrite = canWriteEventData(
    eventRole,
    Boolean(event.accessClosedAt),
    isAdmin(user),
  );
  const preview =
    (isAdmin(user) || canManageEvent(eventRole)) &&
    uiModeForEvent((await cookies()).get(UI_MODE_COOKIE)?.value, batch.eventId) ===
      "preview";
  const canManageUi = canManageBatchUi(canWrite, preview);
  if (!canManageUi && !isBatchReadable(batch)) notFound();
  const transitions = await listMedleyTransitions(batchId);
  const runs = groupMedleyRuns(
    visibleMedleyItems(
      batch.items.map((item) => ({
        ...item,
        title: item.song.title,
        isPublished: item.song.isPublished,
        archived: item.song.archivedAt !== null,
      })),
      !canManageUi,
    ),
  );
  const [requestedGroupId, firstSongId] = runSlug.split("~");
  const run = runs.find(
    (block) =>
      block.kind === "medley" &&
      block.groupId === requestedGroupId &&
      (!firstSongId || block.items[0]?.songId === firstSongId),
  );
  if (!run || run.kind !== "medley") notFound();

  const songIds = run.items.map((item) => item.songId);
  const arrangementIds = run.items
    .map((item) => item.eventSong?.chartArrangementId)
    .filter((id): id is string => Boolean(id));
  const [arrangements, legacyCharts, instrumentCharts, roleTabs] = await Promise.all([
    prisma.chartArrangement.findMany({
      where: {
        id: { in: arrangementIds },
        songId: { in: songIds },
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { section: true },
        },
      },
    }),
    prisma.chordChart.findMany({
      where: { songId: { in: songIds }, isActive: true },
      select: {
        songId: true,
        content: true,
        baseKey: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    Promise.all(
      run.items.map((item) =>
        item.eventSong?.chartArrangementId
          ? getInstrumentChart(item.eventSong.chartArrangementId)
          : getInstrumentChart(""),
      ),
    ),
    prisma.arrangementRoleTab.findMany({
      where: { arrangementId: { in: arrangementIds } },
      select: { role: true, data: true, arrangementId: true },
    }),
  ]);
  const arrangementBySong = new Map(
    arrangements.map((arrangement) => [arrangement.songId, arrangement]),
  );
  const legacyBySong = new Map<string, (typeof legacyCharts)[number]>();
  for (const chart of legacyCharts) {
    if (!legacyBySong.has(chart.songId)) legacyBySong.set(chart.songId, chart);
  }
  const transitionBySong = new Map(
    transitions.map((transition) => [transition.fromSongId, transition]),
  );
  const instrumentChartBySong = new Map(
    songIds.map((songId, index) => [songId, instrumentCharts[index]!]),
  );
  const arrangementById = new Map(arrangements.map((item) => [item.id, item]));
  const roleTabsBySong = new Map<string, { role: string; data: unknown }[]>();
  for (const tab of roleTabs) {
    const arrangement = arrangementById.get(tab.arrangementId);
    if (!arrangement) continue;
    const current = roleTabsBySong.get(arrangement.songId) ?? [];
    current.push({ role: tab.role, data: tab.data });
    roleTabsBySong.set(arrangement.songId, current);
  }
  const songs = run.items.map((item, index) => {
    const arrangement = arrangementBySong.get(item.songId);
    const key = eventSongDisplayKey(
      item.eventSong?.eventKey ?? null,
      arrangement?.defaultKey ?? item.song.key,
    ) || "C";
    const instrumentChart = instrumentChartBySong.get(item.songId);
    const savedTransition = transitionBySong.get(item.songId);
    const arrangementSections =
      arrangement?.items
        .map(({ section, labelOverride, modulationSemitones }) => ({
          id: section.id,
          label: displaySectionLabel(labelOverride?.trim() || section.label, {
            type: section.type,
            content: section.content,
          }),
          content: section.content.trim(),
          modulationSemitones,
          baseKey: key,
          songId: item.songId,
        }))
        .filter((section) => Boolean(section.content)) ?? [];
    const legacy = legacyBySong.get(item.songId);
    const sections =
      arrangementSections.length > 0
        ? arrangementSections
        : legacy
          ? parseLegacyChart(legacy.content).map((section, sectionIndex) => ({
              id: `legacy-${item.songId}-${sectionIndex}`,
              label: section.label,
              content: section.content,
              baseKey: key,
              songId: item.songId,
            }))
          : [];
    return {
      id: item.songId,
      title: item.song.title,
      key,
      sections,
      defaultCapo: instrumentChart?.capo ?? 0,
      instrumentData: instrumentChart?.data ?? {
        sections: {},
        voicings: {},
      },
      roleTabs: roleTabsBySong.get(item.songId) ?? [],
      content:
        sections.length > 0
          ? null
          : legacy?.content ?? null,
      transition:
        savedTransition?.toSongId === run.items[index + 1]?.songId
          ? savedTransition
          : null,
    };
  });
  return (
    <MedleyJoinedSheet
      batchId={batch.id}
      groupId={run.groupId}
      label={run.label}
      songs={songs}
      canWrite={canManageUi}
    />
  );
}
