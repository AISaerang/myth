import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import {
  getCurrentEvent,
  listEvents,
  toPublicEvent,
} from "@server/services/event-service";
import { EventBrief } from "./EventBrief";
import { EventForm } from "./EventForm";
import { EventStatusBadge } from "./EventStatusBadge";

export default async function EventPage() {
  const user = await requireFreshUser();

  if (!isAdmin(user)) {
    const current = await getCurrentEvent();
    if (!current) {
      return (
        <EmptyState
          title="Belum ada event"
          description="Event brief akan tampil di sini setelah admin membuatnya."
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Event Brief
        </h1>
        <EventBrief event={toPublicEvent(current)} />
      </div>
    );
  }

  const events = await listEvents();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Event Brief
      </h1>
      <EventForm mode="create" />
      <Card title={`Semua event (${events.length})`}>
        {events.length === 0 ? (
          <EmptyState title="Belum ada event" />
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/event/${e.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium">{e.name}</span>
                  <EventStatusBadge status={e.eventStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
