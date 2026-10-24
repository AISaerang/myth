// H-day timeline date helpers (Asia/Jakarta calendar days).
// Pure functions — safe to unit-test without a database.

const DAY_MS = 24 * 60 * 60 * 1000;

function jakartaDayKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

// Whole calendar days from `now` until `target` (Jakarta days).
// Positive = upcoming, 0 = today, negative = past.
export function daysUntil(target: Date, now: Date = new Date()): number {
  const toKey = (d: Date) => {
    const [y, m, day] = jakartaDayKey(d).split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toKey(target) - toKey(now)) / DAY_MS);
}

export type TimelineLabel =
  | { kind: "upcoming"; days: number; text: string }
  | { kind: "today"; text: string }
  | { kind: "overdue"; days: number; text: string }
  | { kind: "done"; text: string };

// Human label for a dated item. Pass done=true once the item reached a
// terminal state (COMPLETED/DONE/TESTED/FINAL) so past-due items that are
// finished never read as overdue.
export function timelineLabel(
  date: Date | null,
  now: Date = new Date(),
  done = false,
): TimelineLabel | null {
  if (!date) return null;
  if (done) return { kind: "done", text: "Selesai" };
  const days = daysUntil(date, now);
  if (days > 0) return { kind: "upcoming", days, text: `H-${days}` };
  if (days === 0) return { kind: "today", text: "Hari ini" };
  return { kind: "overdue", days: -days, text: `Terlambat ${-days} hari` };
}

// Label for the event day itself (H-0 reads as "Hari H").
export function hDayLabel(eventDate: Date | null, now: Date = new Date()): string | null {
  if (!eventDate) return null;
  const days = daysUntil(eventDate, now);
  if (days > 0) return `H-${days}`;
  if (days === 0) return "Hari H";
  return `H+${-days} (lewat)`;
}

// Gantt bar position as percentages within [rangeStart, rangeEnd].
// Milestones (no end) render as a fixed 2% marker. Ranges are padded so
// single-day charts still have width.
export function barPosition(
  start: Date,
  end: Date | null,
  rangeStart: Date,
  rangeEnd: Date,
): { left: number; width: number } {
  const t0 = rangeStart.getTime();
  let t1 = rangeEnd.getTime();
  if (t1 <= t0) t1 = t0 + DAY_MS;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const left = clamp(((start.getTime() - t0) / (t1 - t0)) * 100);
  if (!end || end.getTime() <= start.getTime()) {
    return { left, width: 2 };
  }
  const width = Math.max(2, ((end.getTime() - start.getTime()) / (t1 - t0)) * 100);
  return { left, width: Math.min(100 - left, width) };
}

// Tooltip range for Gantt bars: "DD MMM – DD MMM YYYY" (Asia/Jakarta).
// Milestones (no end / same day) render as a single "DD MMM YYYY".
export function formatDateRange(start: Date, end: Date | null): string {
  const fmt = (d: Date, withYear: boolean) =>
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(d);
  if (!end || jakartaDayKey(end) === jakartaDayKey(start)) return fmt(start, true);
  const sameYear = jakartaDayKey(start).slice(0, 4) === jakartaDayKey(end).slice(0, 4);
  return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
}
