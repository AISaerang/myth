import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFreshUser } from "@/lib/auth";
import type { ChartSectionKind } from "@/lib/chart-arrangement";
import { prisma } from "@/lib/db";
import { decideSongEdit, isAdmin } from "@/lib/permissions";
import { getEventRole } from "@server/services/event-access";
import { listChordCharts } from "@server/services/chord-service";
import {
  listChartArrangements,
  listChartSections,
} from "@server/services/chart-arrangement-service";
import {
  ChartArrangementEditor,
  type EditorArrangement,
  type EditorSection,
} from "./ChartArrangementEditor";

export default async function ChartEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ arrangement?: string; eventId?: string }>;
}) {
  const user = await requireFreshUser();

  const { id } = await params;
  const {
    arrangement: requestedArrangementId,
    eventId,
  } = await searchParams;
  const song = await prisma.song.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!song) notFound();

  const scopedEventId = eventId?.trim() || null;
  const [eventSong, event, eventRole, sharedEventCount] = await Promise.all([
    scopedEventId
      ? prisma.eventSong.findUnique({
          where: { eventId_songId: { eventId: scopedEventId, songId: id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    scopedEventId
      ? prisma.event.findUnique({
          where: { id: scopedEventId },
          select: { accessClosedAt: true },
        })
      : Promise.resolve(null),
    scopedEventId ? getEventRole(user, scopedEventId) : Promise.resolve(null),
    prisma.eventSong.count({ where: { songId: id } }),
  ]);
  const decision = decideSongEdit({
    globalAdmin: isAdmin(user),
    eventRole,
    accessClosed: Boolean(event?.accessClosedAt),
    eventId: scopedEventId,
    songLinkedToEvent: Boolean(eventSong && event),
  });
  if (!decision.ok) notFound();
  const editorEventId = decision.scope === "event" ? scopedEventId ?? undefined : undefined;

  const [sections, arrangements, charts] = await Promise.all([
    listChartSections(id),
    listChartArrangements(id),
    listChordCharts(id),
  ]);

  const toSection = (section: {
    id: string;
    type: ChartSectionKind;
    label: string;
    content: string;
    sortOrder: number;
  }): EditorSection => ({
    id: section.id,
    type: section.type,
    label: section.label,
    content: section.content,
    sortOrder: section.sortOrder,
  });

  const sectionViews = sections.map(toSection);
  const arrangementViews: EditorArrangement[] = arrangements.map(
    (arrangement) => ({
      id: arrangement.id,
      name: arrangement.name,
      isActive: arrangement.isActive,
      items: arrangement.items.map((item) => ({
        id: item.id,
        sectionId: item.sectionId,
        labelOverride: item.labelOverride,
        section: toSection(item.section),
      })),
    }),
  );
  const activeLegacy = charts.find((chart) => chart.isActive) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={
            eventId
              ? `/songs/${song.id}?eventId=${eventId}`
              : "/songs/library"
          }
          className="text-sm font-medium text-zinc-500 underline"
        >
          ← Kembali ke {song.title}
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
          Kelola lirik & chord
        </h1>
        <p className="text-sm text-zinc-500">
          Susun master bagian lagu, lalu buat aransemen dari bagian-bagian itu.
        </p>
        {sharedEventCount > 1 ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            Lagu ini dipakai di {sharedEventCount} event. Perubahan chord,
            bagian, dan aransemen ikut ke semua event tersebut.
          </p>
        ) : null}
      </div>

      <ChartArrangementEditor
        songId={song.id}
        eventId={editorEventId}
        sections={sectionViews}
        arrangements={arrangementViews}
        initialArrangementId={requestedArrangementId}
        legacyChart={
          activeLegacy
            ? { label: activeLegacy.label ?? activeLegacy.originalKey }
            : null
        }
      />
    </div>
  );
}
