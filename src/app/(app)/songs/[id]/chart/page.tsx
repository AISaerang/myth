import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFreshUser } from "@/lib/auth";
import type { ChartSectionKind } from "@/lib/chart-arrangement";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
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
  searchParams: Promise<{ arrangement?: string }>;
}) {
  const user = await requireFreshUser();
  if (!isAdmin(user)) notFound();

  const { id } = await params;
  const { arrangement: requestedArrangementId } = await searchParams;
  const song = await prisma.song.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!song) notFound();

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
          href={`/songs/${song.id}`}
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
      </div>

      <ChartArrangementEditor
        songId={song.id}
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
