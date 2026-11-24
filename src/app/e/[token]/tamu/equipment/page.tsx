import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { EquipmentStatusBadge } from "@/app/(app)/rehearsals/OpsBadges";
import { formatJakarta } from "@/lib/format";
import { EQUIPMENT_STATUS_LABEL } from "@/lib/rehearsal-labels";
import { listEquipment } from "@server/services/equipment-service";
import { loadGuestContext } from "../guest-context";

export default async function GuestEquipmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await loadGuestContext(token);
  if (!guest.ok) return null;

  const items = await listEquipment(guest.context.link.eventId);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Equipment & Teknis
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Daftar kebutuhan teknis event ini. Data hanya untuk dilihat.
        </p>
      </div>
      <Card title={`${items.length} item`}>
        {items.length === 0 ? (
          <EmptyState title="Belum ada item equipment" />
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
                      · {item.quantity} · {item.category}
                    </span>
                  </p>
                  <EquipmentStatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.assignee
                    ? `PIC: ${item.assignee.displayName}`
                    : "Tanpa PIC"}
                  {item.ownerOrSource ? ` · Sumber: ${item.ownerOrSource}` : ""}
                  {item.dueAt ? ` · Tenggat ${formatJakarta(item.dueAt)}` : ""}
                </p>
                {item.notes ? (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {item.notes}
                  </p>
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
