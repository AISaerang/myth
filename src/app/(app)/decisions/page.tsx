import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser, requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { getCurrentEvent, listEvents } from "@server/services/event-service";
import { listDecisions } from "@server/services/decision-service";
import { listRehearsals } from "@server/services/rehearsal-service";
import { listSongs } from "@server/services/song-service";
import { EventPicker } from "../songs/EventPicker";
import { DecisionTypeBadge } from "../rehearsals/OpsBadges";
import { CreateDecisionForm } from "./DecisionForms";

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireFreshUser();
  if (!isAdmin(user)) {
    // Keputusan acara dikelola MD/admin (docs/04 nav); personel
    // mengikuti hasilnya lewat data lagu/jadwal.
    await requireAdminUser();
  }
  const params = await searchParams;
  const events = await listEvents();
  if (events.length === 0) {
    return (
      <EmptyState
        title="Belum ada event"
        description="Buat event dulu sebelum mencatat keputusan."
      />
    );
  }
  const current = await getCurrentEvent();
  const eventId =
    params.eventId && events.some((e) => e.id === params.eventId)
      ? params.eventId
      : (current?.id ?? events[0].id);

  const [decisions, songs, rehearsals] = await Promise.all([
    listDecisions(eventId),
    listSongs(eventId),
    listRehearsals(eventId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Keputusan & Catatan
        </h1>
        <EventPicker
          events={events.map((e) => ({ id: e.id, name: e.name }))}
          value={eventId}
        />
      </div>
      <CreateDecisionForm
        eventId={eventId}
        songs={songs.map((s) => ({ id: s.id, title: s.title }))}
        rehearsals={rehearsals.map((r) => ({ id: r.id, title: r.title }))}
      />
      <Card title={`${decisions.length} catatan`}>
        {decisions.length === 0 ? (
          <EmptyState title="Belum ada keputusan tercatat" />
        ) : (
          <ul className="flex flex-col gap-3">
            {decisions.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{d.title}</p>
                  <DecisionTypeBadge type={d.decisionType} />
                </div>
                <p className="mt-1">{d.decisionText}</p>
                {d.reason ? (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Alasan: {d.reason}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  {formatJakarta(d.createdAt)}
                  {d.decidedBy ? ` · oleh ${d.decidedBy}` : ""}
                  {d.relatedSong ? ` · lagu ${d.relatedSong.title}` : ""}
                  {d.relatedRehearsal ? ` · ${d.relatedRehearsal.title}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
