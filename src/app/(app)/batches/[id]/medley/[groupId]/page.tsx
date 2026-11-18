import { notFound } from "next/navigation";
import { MedleyJoinedSheet } from "@/app/(app)/batches/MedleyJoinedSheet";
import { groupMedleyRuns, visibleMedleyItems } from "@/lib/medley-groups";
import { requireFreshUser } from "@/lib/auth";
import { canReadDrafts, canWriteEventData, isAdmin } from "@/lib/permissions";
import { eventSongDisplayKey } from "@/lib/event-song";
import { displaySectionLabel } from "@/lib/chart-arrangement";
import { prisma } from "@/lib/db";
import { getBatch, listMedleyTransitions } from "@server/services/batch-service";
import { getEventRole } from "@server/services/event-access";

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
  const mayReadDrafts = canReadDrafts(eventRole);
  const transitions = await listMedleyTransitions(batchId);
  const runs = groupMedleyRuns(
    visibleMedleyItems(
      batch.items.map((item) => ({
        ...item,
        title: item.song.title,
        isPublished: item.song.isPublished,
        archived: item.song.archivedAt !== null,
      })),
      !mayReadDrafts,
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
  const [arrangements, legacyCharts] = await Promise.all([
    prisma.chartArrangement.findMany({
      where: { songId: { in: songIds }, isActive: true },
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
  const songs = run.items.map((item, index) => {
    const key = eventSongDisplayKey(
      item.eventSong?.eventKey ?? null,
      item.song.key,
    ) || "C";
    const arrangement = arrangementBySong.get(item.songId);
    const savedTransition = transitionBySong.get(item.songId);
    const sections =
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
    return {
      id: item.songId,
      title: item.song.title,
      key,
      sections,
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
      canWrite={canWriteEventData(
        eventRole,
        Boolean(event.accessClosedAt),
        isAdmin(user),
      )}
    />
  );
}
