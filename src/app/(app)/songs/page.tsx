import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin, isObserver } from "@/lib/permissions";
import { getCurrentEvent, listEvents } from "@server/services/event-service";
import { listMySongs, listPublishedSongsForObserver, listSongs } from "@server/services/song-service";
import { EventPicker } from "./EventPicker";
import { SongForm } from "./SongForm";
import { SongStatusBadge } from "./SongStatusBadge";

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireFreshUser();
  const params = await searchParams;

  if (isObserver(user)) {
    const current = await getCurrentEvent();
    if (!current) {
      return (
        <EmptyState
          title="Belum ada lagu"
          description="Lagu yang sudah dipublish akan tampil di sini."
        />
      );
    }
    const songs = await listPublishedSongsForObserver(current.id);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Lagu
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Mode pantau: hanya lagu yang sudah publish. Klik lagu untuk melihat
          progres semua personel dan memberi usulan.
        </p>
        {songs.length === 0 ? (
          <EmptyState
            title="Belum ada lagu publish"
            description="Lagu yang sudah dipublish akan tampil di sini."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {songs.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/songs/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-medium">{s.title}</span>
                    <span className="block text-xs text-zinc-500">
                      {[s.key ? `Key ${s.key}` : null, s.bpm ? `${s.bpm} BPM` : null, s.liturgicalFunction].filter(Boolean).join(" · ") ||
                        `${s.assignments.length} personel`}
                    </span>
                  </span>
                  <SongStatusBadge status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!isAdmin(user)) {
    const current = await getCurrentEvent();
    if (!current) {
      return (
        <EmptyState
          title="Belum ada lagu"
          description="Lagu yang ditugaskan akan tampil di sini."
        />
      );
    }
    const mine = await listMySongs(user.id, current.id);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Lagu Saya
        </h1>
        {mine.length === 0 ? (
          <EmptyState
            title="Belum ada lagu untukmu"
            description="Admin/MD akan menugaskan lagu yang perlu dipelajari."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/songs/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-medium">{s.title}</span>
                    {s.liturgicalFunction ? (
                      <span className="block text-xs text-zinc-500">
                        {s.liturgicalFunction}
                      </span>
                    ) : null}
                  </span>
                  <SongStatusBadge status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const [events, current] = await Promise.all([
    listEvents(),
    getCurrentEvent(),
  ]);
  if (events.length === 0) {
    return (
      <EmptyState
        title="Belum ada event"
        description="Buat event dulu sebelum mengelola lagu."
      />
    );
  }
  const eventId =
    params.eventId && events.some((e) => e.id === params.eventId)
      ? params.eventId
      : (current?.id ?? events[0].id);
  const songs = await listSongs(eventId);
  const activeEvent = events.find((e) => e.id === eventId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Lagu</h1>
        <EventPicker
          events={events.map((e) => ({ id: e.id, name: e.name }))}
          value={eventId}
        />
      </div>
      <SongForm mode="create" eventId={eventId} />
      <Card title={`${activeEvent?.name} — ${songs.length} lagu`}>
        {songs.length === 0 ? (
          <EmptyState title="Belum ada lagu di event ini" />
        ) : (
          <ul className="flex flex-col gap-2">
            {songs.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/songs/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-medium">{s.title}</span>
                    <span className="block text-xs text-zinc-500">
                      {[s.key ? `Key ${s.key}` : null, s.bpm ? `${s.bpm} BPM` : null, s.liturgicalFunction].filter(Boolean).join(" · ") ||
                        "—"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {!s.isPublished ? <Badge tone="neutral">Draft internal</Badge> : null}
                    <SongStatusBadge status={s.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
