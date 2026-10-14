import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser, requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getCurrentEvent, listEvents } from "@server/services/event-service";
import { listBatches } from "@server/services/batch-service";
import { EventPicker } from "../songs/EventPicker";
import { BatchForm } from "./BatchForm";
import { BatchStatusBadge } from "./BatchStatusBadge";

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireFreshUser();
  if (!isAdmin(user)) {
    // MVP: batch management is an MD/admin tool. Users follow their
    // assigned songs and the team roster instead.
    await requireAdminUser();
  }
  const params = await searchParams;
  const events = await listEvents();
  if (events.length === 0) {
    return (
      <EmptyState
        title="Belum ada event"
        description="Buat event dulu sebelum mengelola batch."
      />
    );
  }
  const current = await getCurrentEvent();
  const eventId =
    params.eventId && events.some((e) => e.id === params.eventId)
      ? params.eventId
      : (current?.id ?? events[0].id);
  const batches = await listBatches(eventId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Batch</h1>
        <EventPicker
          events={events.map((e) => ({ id: e.id, name: e.name }))}
          value={eventId}
        />
      </div>
      <BatchForm mode="create" eventId={eventId} />
      <Card title={`Semua batch (${batches.length})`}>
        {batches.length === 0 ? (
          <EmptyState title="Belum ada batch di event ini" />
        ) : (
          <ul className="flex flex-col gap-2">
            {batches.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/batches/${b.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-medium">{b.name}</span>
                    <span className="block text-xs text-zinc-500">
                      {b.items.length} lagu
                    </span>
                  </span>
                  <BatchStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
