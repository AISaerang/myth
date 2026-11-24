import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchOrderBadge } from "@/components/BatchOrderBadge";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChordChartSection } from "@/app/(app)/songs/[id]/ChordChartSection";
import { SongStatusBadge } from "@/app/(app)/songs/SongStatusBadge";
import { MATERIAL_CATEGORY_LABEL } from "@/app/(app)/songs/material-labels";
import { badgesForSong } from "@/lib/batch-badge";
import { isAdjacentMedleyPair } from "@/lib/medley-groups";
import { canGuestReadSong } from "@/lib/share-link";
import { resolveSetlistNav } from "@/lib/setlist-nav";
import { SetlistNav } from "@/components/SetlistNav";
import { listEventBatchCatalog, listMedleyTransitions } from "@server/services/batch-service";
import {
  getEventArrangementContent,
  listArrangementRoleTabs,
  listChartSections,
} from "@server/services/chart-arrangement-service";
import { listChordCharts } from "@server/services/chord-service";
import { getInstrumentChart } from "@server/services/instrument-chart-service";
import { getSong } from "@server/services/song-service";
import { loadGuestContext } from "../../guest-context";

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}

export default async function GuestSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; songId: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const { token, songId } = await params;
  const { batchId } = await searchParams;
  const guest = await loadGuestContext(token);
  if (!guest.ok) return null;

  const { link, session } = guest.context;
  const song = await getSong(songId, link.eventId);
  if (!song || !canGuestReadSong(song, link.includeDrafts)) notFound();

  const catalog = await listEventBatchCatalog(link.eventId);
  const setlistNav = resolveSetlistNav(songId, catalog, {
    publishedOnly: !link.includeDrafts,
    batchId,
  });
  const badges = badgesForSong(song.id, catalog, {
    publishedOnly: !link.includeDrafts,
  });
  const medleyTransitions = (
    await Promise.all(
      badges.map((badge) => listMedleyTransitions(badge.batchId)),
    )
  )
    .flat()
    .filter(
      (transition) =>
        (transition.fromSongId === song.id || transition.toSongId === song.id) &&
        catalog.some((batch) =>
          isAdjacentMedleyPair(
            batch.items,
            transition.fromSongId,
            transition.toSongId,
          ),
        ),
    );

  const [charts, arrangement, sections] = await Promise.all([
    listChordCharts(song.id),
    getEventArrangementContent({ songId: song.id, eventId: link.eventId }),
    listChartSections(song.id),
  ]);
  const [instrumentChart, roleTabs] = await Promise.all([
    getInstrumentChart(arrangement?.id ?? ""),
    listArrangementRoleTabs(arrangement?.id ?? ""),
  ]);
  const activeMaterials = song.materials.filter((material) => material.isActive);
  const backHref = `/e/${token}/tamu/lagu`;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 break-words text-xl font-bold tracking-tight sm:text-2xl">
          {song.title}
        </h1>
        {song.isPublished ? (
          <Badge tone="success">Dipublikasi</Badge>
        ) : (
          <Badge tone="neutral">Draft internal</Badge>
        )}
        <SongStatusBadge status={song.status} />
        {badges.map((badge) => (
          <BatchOrderBadge
            key={badge.anchorId}
            badge={badge.badge}
            batchName={badge.batchName}
          />
        ))}
      </div>
      <SetlistNav
        songId={song.id}
        nav={setlistNav}
        context={{ kind: "guest", token }}
      />
      <Link href={backHref} className="text-sm font-medium underline">
        ← Kembali ke daftar lagu
      </Link>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="order-2 min-w-0 space-y-4 lg:order-none lg:col-start-2 lg:row-start-1">
          <Card title="Overview">
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
              <Meta label="Fungsi liturgi" value={song.liturgicalFunction} />
              <Meta label="Artis/pencipta" value={song.artistOrAuthor} />
              <Meta label="Key" value={song.key} />
              <Meta label="Tempo" value={song.bpm ? `${song.bpm} BPM` : null} />
              <Meta label="Birama" value={song.timeSignature} />
              <Meta
                label="Estimasi durasi"
                value={
                  song.estimatedDurationSeconds
                    ? `${Math.floor(song.estimatedDurationSeconds / 60)}:${String(song.estimatedDurationSeconds % 60).padStart(2, "0")}`
                    : null
                }
              />
              <Meta label="Batch" value={song.batchItems.map((b) => b.batch.name).join(", ") || null} />
            </dl>
            {song.originalReferenceUrl ? (
              <p className="mt-3 text-sm">
                <a
                  href={song.originalReferenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  Buka referensi original
                </a>
              </p>
            ) : null}
            {song.arrangementNotes ? (
              <div className="mt-3 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
                <p className="font-medium">Arah aransemen (MD)</p>
                <p className="text-zinc-600 break-words dark:text-zinc-400">
                  {song.arrangementNotes}
                </p>
              </div>
            ) : null}
          </Card>

          {medleyTransitions.length > 0 ? (
            <Card title="Transisi medley">
              <ul className="flex flex-col gap-3 text-sm">
                {medleyTransitions.map((transition) => (
                  <li
                    key={transition.id}
                    className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <p className="font-medium">
                      Menuju lagu berikutnya ·{" "}
                      {transition.toSongId === song.id
                        ? "dari lagu sebelumnya"
                        : "ke lagu berikutnya"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                      {transition.content}
                    </p>
                    {transition.notes ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {transition.notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="order-1 min-w-0 max-w-full lg:order-none lg:col-start-1 lg:row-start-1">
          <ChordChartSection
            songId={song.id}
            eventId={link.eventId}
            songKey={song.key}
            defaultCapo={instrumentChart.capo}
            instrumentData={instrumentChart.data}
            eventSongId={song.eventSongId}
            admin={false}
            charts={charts}
            arrangement={arrangement}
            sections={sections.map((section) => ({
              id: section.id,
              label: section.label,
              type: section.type,
            }))}
            notes={[]}
            noteTargetOptions={[]}
            canWriteNotes={false}
            canModerateNotes={false}
            currentUserId={session.id}
            defaultPart={null}
            roleTabs={roleTabs.map((tab) => ({ role: tab.role, data: tab.data }))}
            arrangements={[]}
            selectedArrangementId={null}
            sharedEventCount={0}
          />
        </div>
      </div>

      <Card title="Materi aktif">
        {activeMaterials.length === 0 ? (
          <EmptyState title="Belum ada materi aktif" />
        ) : (
          <ul className="flex flex-col gap-2">
            {activeMaterials.map((material) => (
              <li
                key={material.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <p className="font-medium">
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {material.title}
                  </a>
                </p>
                <p className="text-zinc-500">
                  {MATERIAL_CATEGORY_LABEL[material.category]}
                  {material.versionLabel ? ` · ${material.versionLabel}` : ""}
                </p>
                {material.description ? (
                  <p className="text-zinc-600 break-words dark:text-zinc-400">
                    {material.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
