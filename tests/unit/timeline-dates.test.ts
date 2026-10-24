import { describe, expect, it } from "vitest";
import {
  barPosition,
  daysUntil,
  hDayLabel,
  timelineLabel,
} from "@/lib/timeline-dates";

// Fixed instants in Asia/Jakarta (+07:00) so tests are TZ-independent.
const NOW = new Date("2026-10-15T12:00:00+07:00");

describe("daysUntil (Jakarta calendar days)", () => {
  it("counts whole days across midnight boundaries", () => {
    expect(
      daysUntil(new Date("2026-10-15T23:59:00+07:00"), NOW),
    ).toBe(0);
    expect(daysUntil(new Date("2026-10-16T00:01:00+07:00"), NOW)).toBe(1);
    expect(daysUntil(new Date("2026-10-22T10:00:00+07:00"), NOW)).toBe(7);
    expect(daysUntil(new Date("2026-10-14T10:00:00+07:00"), NOW)).toBe(-1);
  });
});

describe("timelineLabel", () => {
  it("labels upcoming, today, overdue, done, and dateless", () => {
    expect(
      timelineLabel(new Date("2026-10-22T10:00:00+07:00"), NOW)?.text,
    ).toBe("H-7");
    expect(
      timelineLabel(new Date("2026-10-15T20:00:00+07:00"), NOW)?.text,
    ).toBe("Hari ini");
    expect(
      timelineLabel(new Date("2026-10-13T10:00:00+07:00"), NOW)?.text,
    ).toBe("Terlambat 2 hari");
    expect(
      timelineLabel(new Date("2026-10-13T10:00:00+07:00"), NOW, true)?.text,
    ).toBe("Selesai");
    expect(timelineLabel(null, NOW)).toBeNull();
  });
});

describe("hDayLabel", () => {
  it("reads H-0 as Hari H", () => {
    expect(
      hDayLabel(new Date("2026-11-14T00:00:00+07:00"), NOW),
    ).toBe("H-30");
    expect(hDayLabel(new Date("2026-10-15T10:00:00+07:00"), NOW)).toBe(
      "Hari H",
    );
    expect(hDayLabel(null, NOW)).toBeNull();
  });
});

describe("barPosition", () => {
  const t0 = new Date("2026-10-15T00:00:00+07:00");
  const t1 = new Date("2026-11-14T00:00:00+07:00");
  it("maps spans to percentages and milestones to markers", () => {
    const full = barPosition(t0, t1, t0, t1);
    expect(full.left).toBe(0);
    expect(full.width).toBe(100);
    const mid = barPosition(
      new Date("2026-10-20T00:00:00+07:00"),
      null,
      t0,
      t1,
    );
    expect(mid.width).toBe(2);
    expect(mid.left).toBeGreaterThan(0);
    expect(mid.left).toBeLessThan(100);
  });

  it("pads degenerate ranges", () => {
    const pos = barPosition(t0, null, t0, t0);
    expect(pos.width).toBe(2);
  });
});
