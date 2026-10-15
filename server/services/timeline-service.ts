import "server-only";
import { prisma } from "@/lib/db";
import { daysUntil, timelineLabel } from "@/lib/timeline-dates";
import { listRelevantTasks } from "./task-service";

export type TimelineKind =
  | "hday"
  | "batch"
  | "rehearsal"
  | "task"
  | "equipment";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  title: string;
  href: string;
  start: Date | null;
  end: Date | null;
  status: string;
  done: boolean;
}

export interface TimelineData {
  hDay: Date | null;
  items: TimelineItem[];
  unscheduled: TimelineItem[];
  rangeStart: Date | null;
  rangeEnd: Date | null;
}

const KIND_ORDER: Record<TimelineKind, number> = {
  hday: 0,
  batch: 1,
  rehearsal: 2,
  task: 3,
  equipment: 4,
};

function sortItems(items: TimelineItem[]): TimelineItem[] {
  return items.sort((a, b) => {
    const ka = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (ka !== 0) return ka;
    const ta = a.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const tb = b.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return a.title.localeCompare(b.title);
  });
}

// Split dated/undated, then derive the chart range:
// from the earliest of (now, first start) to the latest of
// (H-day, last end). Null range = nothing to draw.
function assemble(
  hDay: Date | null,
  items: TimelineItem[],
  now: Date,
): TimelineData {
  const dated = items.filter((i) => i.start);
  const unscheduled = sortItems(items.filter((i) => !i.start));
  if (!hDay && dated.length === 0) {
    return { hDay, items: [], unscheduled, rangeStart: null, rangeEnd: null };
  }
  const starts = dated.map((i) => (i.start as Date).getTime());
  const ends = dated.map((i) =>
    (i.end ?? i.start as Date).getTime(),
  );
  if (hDay) {
    starts.push(hDay.getTime());
    ends.push(hDay.getTime());
  }
  const rangeStart = new Date(Math.min(now.getTime(), ...starts));
  const rangeEnd = new Date(Math.max(now.getTime(), ...ends));
  return { hDay, items: sortItems(dated), unscheduled, rangeStart, rangeEnd };
}

export function itemLabel(
  item: TimelineItem,
  now: Date,
): ReturnType<typeof timelineLabel> {
  return timelineLabel(item.end ?? item.start, now, item.done);
}

export function isItemOverdue(item: TimelineItem, now: Date): boolean {
  if (item.done) return false;
  const date = item.end ?? item.start;
  if (!date) return false;
  return daysUntil(date, now) < 0;
}

// Full event timeline for admins (docs/08): H-day + batches +
// rehearsals + open tasks + equipment dues.
export async function getEventTimeline(
  eventId: string,
  eventDate: Date | null,
  now: Date = new Date(),
): Promise<TimelineData> {
  const [batches, rehearsals, tasks, equipment] = await Promise.all([
    prisma.songBatch.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        status: true,
        releaseAt: true,
        targetReviewAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.rehearsal.findMany({
      where: { eventId, status: { not: "CANCELLED" } },
      select: { id: true, title: true, type: true, status: true, startsAt: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.task.findMany({
      where: { eventId, status: { notIn: ["DONE", "CANCELLED"] } },
      select: { id: true, title: true, status: true, dueAt: true },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
    }),
    prisma.equipmentItem.findMany({
      where: {
        eventId,
        status: { notIn: ["TESTED", "NOT_APPLICABLE"] },
        dueAt: { not: null },
      },
      select: { id: true, name: true, status: true, dueAt: true },
      orderBy: { dueAt: "asc" },
    }),
  ]);
  const items: TimelineItem[] = [
    ...(eventDate
      ? [
          {
            id: "hday",
            kind: "hday" as const,
            title: "Hari H",
            href: "/event",
            start: eventDate,
            end: null,
            status: "EVENT",
            done: false,
          },
        ]
      : []),
    ...batches.map((b) => ({
      id: `batch-${b.id}`,
      kind: "batch" as const,
      title: b.name,
      href: `/batches/${b.id}`,
      start: b.releaseAt,
      end: b.targetReviewAt,
      status: b.status,
      done: b.status === "COMPLETED" || b.status === "ARCHIVED",
    })),
    ...rehearsals.map((r) => ({
      id: `rehearsal-${r.id}`,
      kind: "rehearsal" as const,
      title: r.title,
      href: `/rehearsals/${r.id}`,
      start: r.startsAt,
      end: null,
      status: r.status,
      done: r.status === "COMPLETED",
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      kind: "task" as const,
      title: t.title,
      href: `/tasks?eventId=${eventId}`,
      start: t.dueAt,
      end: null,
      status: t.status,
      done: false,
    })),
    ...equipment.map((e) => ({
      id: `equipment-${e.id}`,
      kind: "equipment" as const,
      title: e.name,
      href: `/equipment?eventId=${eventId}`,
      start: e.dueAt,
      end: null,
      status: e.status,
      done: false,
    })),
  ];
  return assemble(eventDate, items, now);
}

// Personal timeline: H-day + batches holding my published songs +
// upcoming rehearsals + my relevant tasks + my equipment dues.
// Everything here is already visible to this user elsewhere.
export async function getUserTimeline(
  userId: string,
  eventId: string,
  eventDate: Date | null,
  now: Date = new Date(),
): Promise<TimelineData> {
  const person = await prisma.person.findUnique({ where: { userId } });
  if (!person) {
    return assemble(
      eventDate,
      eventDate
        ? [
            {
              id: "hday",
              kind: "hday",
              title: "Hari H",
              href: "/event",
              start: eventDate,
              end: null,
              status: "EVENT",
              done: false,
            },
          ]
        : [],
      now,
    );
  }
  const [myBatches, rehearsals, myTasks, myEquipment] = await Promise.all([
    prisma.songBatch.findMany({
      where: {
        eventId,
        items: {
          some: {
            song: {
              isPublished: true,
              assignments: { some: { personId: person.id } },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        releaseAt: true,
        targetReviewAt: true,
      },
    }),
    prisma.rehearsal.findMany({
      where: {
        eventId,
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
        startsAt: { gte: now },
      },
      select: { id: true, title: true, type: true, status: true, startsAt: true },
      orderBy: { startsAt: "asc" },
    }),
    listRelevantTasks(userId, eventId),
    prisma.equipmentItem.findMany({
      where: {
        eventId,
        assigneePersonId: person.id,
        status: { notIn: ["TESTED", "NOT_APPLICABLE"] },
        dueAt: { not: null },
      },
      select: { id: true, name: true, status: true, dueAt: true },
    }),
  ]);
  const items: TimelineItem[] = [
    ...(eventDate
      ? [
          {
            id: "hday",
            kind: "hday" as const,
            title: "Hari H",
            href: "/event",
            start: eventDate,
            end: null,
            status: "EVENT",
            done: false,
          },
        ]
      : []),
    ...myBatches.map((b) => ({
      id: `batch-${b.id}`,
      kind: "batch" as const,
      title: b.name,
      href: `/batches/${b.id}`,
      start: b.releaseAt,
      end: b.targetReviewAt,
      status: b.status,
      done: b.status === "COMPLETED" || b.status === "ARCHIVED",
    })),
    ...rehearsals.map((r) => ({
      id: `rehearsal-${r.id}`,
      kind: "rehearsal" as const,
      title: r.title,
      href: `/rehearsals/${r.id}`,
      start: r.startsAt,
      end: null,
      status: r.status,
      done: false,
    })),
    ...myTasks
      .filter((t) => t.dueAt)
      .map((t) => ({
        id: `task-${t.id}`,
        kind: "task" as const,
        title: t.title,
        href: "/tasks",
        start: t.dueAt as Date,
        end: null,
        status: t.status,
        done: false,
      })),
    ...myEquipment.map((e) => ({
      id: `equipment-${e.id}`,
      kind: "equipment" as const,
      title: e.name,
      href: "/equipment",
      start: e.dueAt as Date,
      end: null,
      status: e.status,
      done: false,
    })),
  ];
  return assemble(eventDate, items, now);
}
