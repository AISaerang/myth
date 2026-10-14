import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { EQUIPMENT_STATUS_LABEL } from "@/lib/rehearsal-labels";
import { getCurrentEvent, listEvents } from "@server/services/event-service";
import { listEquipment } from "@server/services/equipment-service";
import { listPersonnelForAdmin } from "@server/services/personnel-service";
import { EventPicker } from "../songs/EventPicker";
import { EquipmentStatusBadge } from "../rehearsals/OpsBadges";
import { CreateEquipmentForm, EditEquipmentForm } from "./EquipmentForms";

const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "NOT_CHECKED", label: "Belum dicek" },
  { value: "NEEDED", label: "Butuh konfirmasi" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "TESTED", label: "Teruji" },
] as const;

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; filter?: string }>;
}) {
  const user = await requireFreshUser();
  const params = await searchParams;
  const admin = isAdmin(user);

  const events = await listEvents();
  if (events.length === 0) {
    return (
      <EmptyState
        title="Belum ada event"
        description="Buat event dulu sebelum mengelola equipment."
      />
    );
  }
  const current = await getCurrentEvent();
  const eventId =
    params.eventId && events.some((e) => e.id === params.eventId)
      ? params.eventId
      : (current?.id ?? events[0].id);
  const filter = FILTERS.some((f) => f.value === params.filter)
    ? (params.filter as (typeof FILTERS)[number]["value"])
    : "all";

  const items = await listEquipment(
    eventId,
    filter === "all" ? undefined : filter,
  );
  const people = admin
    ? (await listPersonnelForAdmin())
        .filter((p) => p.isActive)
        .map((p) => ({ id: p.id, displayName: p.displayName }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Equipment & Teknis
        </h1>
        {admin ? (
          <EventPicker
            events={events.map((e) => ({ id: e.id, name: e.name }))}
            value={eventId}
          />
        ) : null}
      </div>

      <nav aria-label="Filter equipment" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/equipment?eventId=${eventId}&filter=${f.value}`}
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

      {admin ? <CreateEquipmentForm eventId={eventId} people={people} /> : null}

      <Card title={`${items.length} item`}>
        {items.length === 0 ? (
          <EmptyState title="Tidak ada item pada filter ini" />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {item.name}{" "}
                    <span className="font-normal text-zinc-500">
                      ×{item.quantity} · {item.category}
                    </span>
                  </p>
                  <EquipmentStatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.assignee ? `PIC: ${item.assignee.displayName}` : "Tanpa PIC"}
                  {item.ownerOrSource ? ` · Sumber: ${item.ownerOrSource}` : ""}
                  {item.dueAt ? ` · Tenggat ${formatJakarta(item.dueAt)}` : ""}
                </p>
                {item.notes ? (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{item.notes}</p>
                ) : null}
                {admin ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium underline">
                      Ubah
                    </summary>
                    <div className="mt-2">
                      <EditEquipmentForm
                        itemId={item.id}
                        people={people}
                        defaults={{
                          name: item.name,
                          category: item.category,
                          quantity: item.quantity,
                          status: item.status,
                          ownerOrSource: item.ownerOrSource,
                          assigneePersonId: item.assignee?.id ?? null,
                          notes: item.notes,
                          dueAtIso: item.dueAt
                            ? new Date(item.dueAt).toISOString().slice(0, 16)
                            : "",
                        }}
                      />
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-zinc-500">
        Status: {Object.values(EQUIPMENT_STATUS_LABEL).join(" · ")}
      </p>
    </div>
  );
}
