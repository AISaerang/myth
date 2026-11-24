import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  RehearsalStatusBadge,
  RehearsalTypeBadge,
} from "@/app/(app)/rehearsals/OpsBadges";
import { formatJakarta } from "@/lib/format";
import { listRehearsals } from "@server/services/rehearsal-service";
import { loadGuestContext } from "../guest-context";

export default async function GuestRehearsalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await loadGuestContext(token);
  if (!guest.ok) return null;

  const rehearsals = await listRehearsals(guest.context.link.eventId);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Rehearsal
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Jadwal sesi latihan event ini. Data hanya untuk dilihat.
        </p>
      </div>
      <Card title={`Semua sesi (${rehearsals.length})`}>
        {rehearsals.length === 0 ? (
          <EmptyState
            title="Belum ada rehearsal"
            description="Jadwal rehearsal akan tampil di sini."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {rehearsals.map((rehearsal) => (
              <li
                key={rehearsal.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <span>
                  <span className="font-medium">{rehearsal.title}</span>
                  <span className="block text-xs text-zinc-500">
                    {formatJakarta(rehearsal.startsAt)}
                    {rehearsal.endsAt
                      ? ` – ${formatJakarta(rehearsal.endsAt)}`
                      : ""}{" "}
                    · {rehearsal._count.songs} lagu
                    {rehearsal.venueOrMeetingUrl
                      ? ` · ${rehearsal.venueOrMeetingUrl}`
                      : ""}
                  </span>
                  {rehearsal.agenda ? (
                    <span className="mt-1 block text-zinc-600 dark:text-zinc-400">
                      {rehearsal.agenda}
                    </span>
                  ) : null}
                  {rehearsal.notes ? (
                    <span className="mt-1 block text-xs text-zinc-500">
                      {rehearsal.notes}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1">
                  <RehearsalTypeBadge type={rehearsal.type} />
                  <RehearsalStatusBadge status={rehearsal.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
