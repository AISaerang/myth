import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatJakarta } from "@/lib/format";
import { barPosition, hDayLabel } from "@/lib/timeline-dates";
import {
  getEventTimeline,
  getUserTimeline,
  isItemOverdue,
  itemLabel,
  type TimelineData,
  type TimelineItem,
} from "@server/services/timeline-service";

const KIND_LABEL: Record<TimelineItem["kind"], string> = {
  hday: "Hari H",
  batch: "Batch",
  rehearsal: "Rehearsal",
  task: "Task",
  equipment: "Teknis",
};

const KIND_BAR: Record<TimelineItem["kind"], string> = {
  hday: "bg-zinc-900 dark:bg-zinc-100",
  batch: "bg-sky-500",
  rehearsal: "bg-violet-500",
  task: "bg-amber-500",
  equipment: "bg-emerald-500",
};

function shortDate(value: Date): string {
  return formatJakarta(value, { hour: undefined, minute: undefined });
}

function ItemBadge({ item, now }: { item: TimelineItem; now: Date }) {
  const label = itemLabel(item, now);
  if (!label) return null;
  if (label.kind === "overdue")
    return <Badge tone="danger">{label.text}</Badge>;
  if (label.kind === "today") return <Badge tone="success">{label.text}</Badge>;
  if (label.kind === "done") return <Badge tone="neutral">{label.text}</Badge>;
  return <Badge tone="neutral">{label.text}</Badge>;
}

function GanttChart({ data, now }: { data: TimelineData; now: Date }) {
  const { rangeStart, rangeEnd, hDay } = data;
  if (!rangeStart || !rangeEnd) return null;
  const ticks = [0, 1, 2, 3, 4].map(
    (i) =>
      new Date(
        rangeStart.getTime() +
          ((rangeEnd.getTime() - rangeStart.getTime()) * i) / 4,
      ),
  );
  const todayPct = (() => {
    const t0 = rangeStart.getTime();
    const t1 = Math.max(rangeEnd.getTime(), t0 + 1);
    const pct = ((now.getTime() - t0) / (t1 - t0)) * 100;
    return pct >= 0 && pct <= 100 ? pct : null;
  })();
  const hDayPct = hDay
    ? (() => {
        const t0 = rangeStart.getTime();
        const t1 = Math.max(rangeEnd.getTime(), t0 + 1);
        const pct = ((hDay.getTime() - t0) / (t1 - t0)) * 100;
        return pct >= 0 && pct <= 100 ? pct : null;
      })()
    : null;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px]">
        <div className="flex">
          <div className="w-44 shrink-0" />
          <div className="relative flex-1">
            <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              {ticks.map((t, i) => (
                <span key={i}>{shortDate(t)}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex">
          <div className="w-44 shrink-0">
            {data.items.map((item) => (
              <div
                key={item.id}
                className="flex h-9 items-center gap-1.5 pr-2"
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${KIND_BAR[item.kind]}`}
                />
                <Link
                  href={item.href}
                  className="truncate text-sm font-medium underline"
                  title={item.title}
                >
                  {item.title}
                </Link>
              </div>
            ))}
          </div>
          <div className="relative flex-1">
            {todayPct !== null ? (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 w-px bg-red-500"
                style={{ left: `${todayPct}%` }}
              />
            ) : null}
            {hDayPct !== null ? (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 w-0.5 bg-zinc-900 dark:bg-zinc-100"
                style={{ left: `${hDayPct}%` }}
              />
            ) : null}
            {data.items.map((item) => {
              const pos = barPosition(
                item.start as Date,
                item.end,
                rangeStart,
                rangeEnd,
              );
              const overdue = isItemOverdue(item, now);
              return (
                <div key={item.id} className="relative h-9">
                  <div
                    className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${KIND_BAR[item.kind]} ${item.done ? "opacity-40" : ""} ${overdue ? "ring-2 ring-red-500 ring-offset-1 dark:ring-offset-zinc-950" : ""}`}
                    style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                    title={`${item.title} — ${itemLabel(item, now)?.text ?? ""}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="w-28 shrink-0 pl-2">
            {data.items.map((item) => (
              <div key={item.id} className="flex h-9 items-center">
                <ItemBadge item={item} now={now} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map(
            (k) => (
              <span key={k} className="flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${KIND_BAR[k]}`}
                />
                {KIND_LABEL[k]}
              </span>
            ),
          )}
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-3 w-px bg-red-500" />
            Hari ini
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelineBody({ data, now }: { data: TimelineData; now: Date }) {
  if (!data.rangeStart || !data.rangeEnd || data.items.length === 0) {
    return (
      <EmptyState
        title="Belum ada jadwal"
        description="Isi tanggal event, tanggal batch, jadwal rehearsal, dan tenggat task agar timeline tampil."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <GanttChart data={data} now={now} />
      {data.unscheduled.length > 0 ? (
        <div>
          <p className="mb-1 text-sm font-medium">Belum terjadwal</p>
          <ul className="flex flex-col gap-1 text-sm">
            {data.unscheduled.map((item) => (
              <li key={item.id} className="text-zinc-600 dark:text-zinc-400">
                <span className="mr-1 text-xs text-zinc-400">
                  {KIND_LABEL[item.kind]}
                </span>
                <Link href={item.href} className="font-medium underline">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export async function AdminTimelineCard({
  eventId,
  eventName,
  eventDate,
}: {
  eventId: string;
  eventName: string;
  eventDate: Date | null;
}) {
  const now = new Date();
  const data = await getEventTimeline(eventId, eventDate, now);
  const hLabel = hDayLabel(eventDate, now);
  return (
    <Card
      title={`Timeline ke Hari H${hLabel ? ` · ${hLabel}` : ""}`}
    >
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        {eventName}
        {eventDate ? ` · ${shortDate(eventDate)}` : " · tanggal belum diisi"}
      </p>
      <TimelineBody data={data} now={now} />
    </Card>
  );
}

export async function UserTimelineCard({
  userId,
  eventId,
  eventName,
  eventDate,
}: {
  userId: string;
  eventId: string;
  eventName: string;
  eventDate: Date | null;
}) {
  const now = new Date();
  const data = await getUserTimeline(userId, eventId, eventDate, now);
  const hLabel = hDayLabel(eventDate, now);
  return (
    <Card
      title={`Timeline ke Hari H${hLabel ? ` · ${hLabel}` : ""}`}
    >
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        {eventName}
        {eventDate ? ` · ${shortDate(eventDate)}` : ""}
      </p>
      <TimelineBody data={data} now={now} />
    </Card>
  );
}
