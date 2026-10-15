import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser, requireFreshUser } from "@/lib/auth";
import { isAdmin, isObserver } from "@/lib/permissions";
import { getCurrentEvent, listEvents } from "@server/services/event-service";
import { listBatches } from "@server/services/batch-service";
import { EventPicker } from "../songs/EventPicker";
import { BatchForm } from "./BatchForm";
import { BatchStatusBadge } from "./BatchStatusBadge";
import { DeleteBatchButton } from "./DeleteBatchButton";

type BatchFilter = "active" | "all" | "archived";

const FILTERS: { value: BatchFilter; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "all", label: "Semua" },
  { value: "archived", label: "Arsip" },
];

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; filter?: string }>;
}) {
  const user = await requireFreshUser();
  if (!isAdmin(user) && !isObserver(user)) {
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
  const filter: BatchFilter = FILTERS.some((f) => f.value === params.filter)
    ? (params.filter as BatchFilter)
    : "active";

  const all = await listBatches(eventId);
  const visible = all.filter((b) =>
    filter === "all"
      ? true
      : filter === "archived"
        ? b.status === "ARCHIVED"
        : b.status !== "ARCHIVED",
  );
  const observer = isObserver(user);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Batch</h1>
        <EventPicker
          events={events.map((e) => ({ id: e.id, name: e.name }))}
          value={eventId}
        />
      </div>
      {observer ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Mode pantau: daftar batch read-only. Klik batch untuk melihat lagu-lagunya.
        </p>
      ) : (
        <BatchForm mode="create" eventId={eventId} />
      )}
      <nav aria-label="Filter batch" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/batches?eventId=${eventId}&filter=${f.value}`}
            aria-current={filter === f.value ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              filter === f.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <Card title={`Batch (${visible.length})`}>
        {visible.length === 0 ? (
          <EmptyState
            title={
              filter === "archived"
                ? "Tidak ada batch arsip"
                : "Belum ada batch di event ini"
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <Link
                  href={`/batches/${b.id}`}
                  className="font-medium underline"
                >
                  {b.name}
                  <span className="block text-xs font-normal text-zinc-500 no-underline">
                    {b.items.length} lagu
                  </span>
                </Link>
                <span className="flex items-center gap-2">
                  <BatchStatusBadge status={b.status} />
                  {!observer && b.items.length === 0 ? (
                    <DeleteBatchButton batchId={b.id} batchName={b.name} />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
