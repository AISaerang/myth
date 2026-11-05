import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BatchOrderBadge } from "@/components/BatchOrderBadge";
import { BatchSongGroups } from "./BatchSongGroups";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventTypeBadge } from "@/components/ui/EventTypeBadge";
import { badgesForSong, groupSongsByBatchBadge } from "@/lib/batch-badge";
import { requireFreshUser } from "@/lib/auth";
import {
  canManageEvent,
  canWriteEventData,
  isAdmin,
  isObserver,
} from "@/lib/permissions";
import { listEventBatchCatalog } from "@server/services/batch-service";
import { getEventRole } from "@server/services/event-access";
import { getActiveEventFor, listEvents } from "@server/services/event-service";
import {
  listAvailableSongsForEvent,
  listPublishedSongsForMember,
  listPublishedSongsForObserver,
  listSongLibrary,
  listSongs,
} from "@server/services/song-service";
import { notFound } from "next/navigation";
import { EventPicker } from "./EventPicker";
import { SongForm } from "./SongForm";
import { SongLibraryPicker } from "./SongLibraryPicker";
import { SongStatusBadge } from "./SongStatusBadge";

async function SongsContent({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  await connection();
  const user = await requireFreshUser();
  const params = await searchParams;

  if (isObserver(user)) {
    const current = await getActiveEventFor(user, params.eventId);
    if (!current) {
      if (params.eventId) notFound();
      return (
        <EmptyState
          title="Belum ada lagu"
          description="Lagu yang sudah dipublish akan tampil di sini."
        />
      );
    }
    const [songs, catalog] = await Promise.all([
      listPublishedSongsForObserver(current.id),
      listEventBatchCatalog(current.id),
    ]);
    const groups = groupSongsByBatchBadge(songs, catalog);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Lagu
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Mode pantau: hanya lagu yang sudah publish, diurut badge batch. Klik lagu untuk melihat progres semua personel dan memberi usulan.
        </p>
        {songs.length === 0 ? (
          <EmptyState
            title="Belum ada lagu publish"
            description="Lagu yang sudah dipublish akan tampil di sini."
          />
        ) : (
          <BatchSongGroups eventId={current.id} groups={groups} />
        )}
      </div>
    );
  }

  const [events, current] = await Promise.all([
    listEvents(user),
    getActiveEventFor(user, params.eventId),
  ]);
  if (events.length === 0) {
    if (params.eventId) notFound();
    return (
      <EmptyState
        title="Belum ada event"
        description="Buat event dulu sebelum mengelola lagu."
      />
    );
  }
  const eventId = current?.id;
  if (!eventId) notFound();
  const eventRole = await getEventRole(user, eventId);
  const manager = isAdmin(user) || canManageEvent(eventRole);
  const canWrite = canWriteEventData(
    eventRole,
    Boolean(current?.accessClosedAt),
    isAdmin(user),
  );
  if (!manager) {
    const [songs, catalog] = await Promise.all([
      listPublishedSongsForMember(eventId),
      listEventBatchCatalog(eventId),
    ]);
    const groups = groupSongsByBatchBadge(songs, catalog);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Lagu Saya</h1>
          <EventTypeBadge type={current.eventType} />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nomor di kiri adalah badge batch (urutan lagu di dalam batch), bukan status latihan.
        </p>
        {songs.length === 0 ? (
          <EmptyState
            title="Belum ada lagu publish"
            description="Lagu yang sudah dipublish di event ini akan tampil di sini."
          />
        ) : (
          <BatchSongGroups eventId={current.id} groups={groups} />
        )}
      </div>
    );
  }
  const [songs, availableLibrarySongs, catalog] = await Promise.all([
    listSongs(eventId),
    listAvailableSongsForEvent(eventId),
    listEventBatchCatalog(eventId),
  ]);
  const librarySongs = isAdmin(user) ? await listSongLibrary() : [];
  const activeEvent = events.find((e) => e.id === eventId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Lagu</h1>
          {isAdmin(user) ? (
            <Link href="/songs/library" className="text-sm font-medium underline">
              Pustaka Lagu
            </Link>
          ) : null}
        </div>
        <EventPicker
          events={events.map((e) => ({ id: e.id, name: e.name, eventType: e.eventType }))}
          value={eventId}
        />
      </div>
      {activeEvent ? <EventTypeBadge type={activeEvent.eventType} /> : null}
      {isAdmin(user) ? <SongForm mode="create" eventId={eventId} /> : null}
      {canWrite ? (
        <Card title="Tambah dari Pustaka Lagu">
          <SongLibraryPicker eventId={eventId} songs={availableLibrarySongs} />
        </Card>
      ) : null}
      {isAdmin(user) && librarySongs.length === 0 ? (
        <p className="text-sm text-zinc-500">Pustaka belum memiliki lagu master.</p>
      ) : null}
      <Card title={`${activeEvent?.name} — ${songs.length} lagu`}>
        {songs.length === 0 ? (
          <EmptyState title="Belum ada lagu di event ini" />
        ) : (
          <ul className="flex flex-col gap-2">
            {songs.map((s) => {
              const badges = badgesForSong(s.id, catalog);
              return (
              <li key={s.id}>
                <Link
                  href={`/songs/${s.id}?eventId=${eventId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {badges.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {badges.map((badge) => (
                          <BatchOrderBadge
                            key={badge.anchorId}
                            badge={badge.badge}
                            batchName={badges.length > 1 ? badge.batchName : null}
                          />
                        ))}
                      </span>
                    ) : null}
                    <span className="min-w-0">
                      <span className="font-medium">{s.title}</span>
                      <span className="block text-xs text-zinc-500">
                        {[s.key ? `Key ${s.key}` : null, s.bpm ? `${s.bpm} BPM` : null, s.liturgicalFunction].filter(Boolean).join(" · ") ||
                          "—"}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {!s.isPublished ? <Badge tone="neutral">Draft internal</Badge> : null}
                    <SongStatusBadge status={s.status} />
                  </span>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p aria-busy="true" aria-live="polite" className="text-sm text-zinc-500">
          Memuat lagu...
        </p>
      }
    >
      <SongsContent searchParams={searchParams} />
    </Suspense>
  );
}
