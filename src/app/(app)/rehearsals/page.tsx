import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { getCurrentEvent, listEvents } from "@server/services/event-service";
import {
  listRehearsals,
  listUpcomingRehearsals,
} from "@server/services/rehearsal-service";
import { EventPicker } from "../songs/EventPicker";
import { RehearsalForm } from "./RehearsalForm";
import { RehearsalStatusBadge, RehearsalTypeBadge } from "./OpsBadges";

export default async function RehearsalsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireFreshUser();
  const params = await searchParams;
  const admin = isAdmin(user);

  const events = await listEvents();
  if (events.length === 0) {
    return (
      <EmptyState
        title="Belum ada event"
        description="Buat event dulu sebelum menjadwalkan rehearsal."
      />
    );
  }
  const current = await getCurrentEvent();
  const eventId =
    params.eventId && events.some((e) => e.id === params.eventId)
      ? params.eventId
      : (current?.id ?? events[0].id);

  if (!admin) {
    const upcoming = await listUpcomingRehearsals(eventId);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Rehearsal</h1>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Belum ada jadwal"
            description="Jadwal rehearsal akan tampil di sini."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/rehearsals/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-medium">{r.title}</span>
                    <span className="block text-xs text-zinc-500">
                      {formatJakarta(r.startsAt)} · {r.songs.length} lagu
                    </span>
                  </span>
                  <RehearsalTypeBadge type={r.type} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const rehearsals = await listRehearsals(eventId);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Rehearsal</h1>
        <EventPicker
          events={events.map((e) => ({ id: e.id, name: e.name }))}
          value={eventId}
        />
      </div>
      <RehearsalForm mode="create" eventId={eventId} />
      <Card title={`Semua sesi (${rehearsals.length})`}>
        {rehearsals.length === 0 ? (
          <EmptyState title="Belum ada rehearsal di event ini" />
        ) : (
          <ul className="flex flex-col gap-2">
            {rehearsals.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/rehearsals/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-medium">{r.title}</span>
                    <span className="block text-xs text-zinc-500">
                      {formatJakarta(r.startsAt)} · {r._count.songs} lagu ·{" "}
                      {r._count.attendance} kehadiran tercatat
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <RehearsalTypeBadge type={r.type} />
                    <RehearsalStatusBadge status={r.status} />
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
