import { describe, expect, it } from "vitest";
import { planArrangementBackfill } from "@/lib/arrangement-backfill";

describe("arrangement backfill", () => {
  it("keeps existing arrangement names and uses the active one as default", () => {
    const plan = planArrangementBackfill(
      [{
        id: "song-1",
        createdById: "user-1",
        hasInstrumentChart: true,
        arrangements: [
          { id: "old", name: "Aransemen Utama", isActive: true, createdAt: "2026-01-01" },
          { id: "new", name: "Medley Natal", isActive: false, createdAt: "2026-02-01" },
        ],
      }],
      [{ eventId: "event-1", songId: "song-1" }],
    );
    expect(plan.arrangementsToCreate).toEqual([]);
    expect(plan.defaultBySong["song-1"]).toEqual({
      arrangementId: "old",
      name: "Aransemen Utama",
    });
    expect(plan.eventSongArrangement["event-1:song-1"]).toBe("old");
    expect(plan.instrumentChartArrangement["song-1"]).toBe("old");
  });

  it("creates Default only for songs with zero arrangements and preserves no-data-loss links", () => {
    const plan = planArrangementBackfill(
      [{
        id: "song-2",
        createdById: "user-1",
        hasInstrumentChart: true,
        arrangements: [],
      }],
      [{ eventId: "event-2", songId: "song-2" }],
    );
    expect(plan.arrangementsToCreate).toEqual([
      { songId: "song-2", name: "Default", isActive: true },
    ]);
    expect(plan.defaultBySong["song-2"]?.name).toBe("Default");
    expect(plan.eventSongArrangement["event-2:song-2"]).toBe("arr-default-song-2");
    expect(plan.instrumentChartArrangement["song-2"]).toBe("arr-default-song-2");
  });

  it("activates the oldest existing arrangement when no active row exists", () => {
    const plan = planArrangementBackfill(
      [{
        id: "song-3",
        createdById: "user-1",
        hasInstrumentChart: false,
        arrangements: [
          { id: "late", name: "Belakangan", isActive: false, createdAt: "2026-03-01" },
          { id: "early", name: "Awal", isActive: false, createdAt: "2026-01-01" },
        ],
      }],
      [],
    );
    expect(plan.defaultBySong["song-3"]).toEqual({
      arrangementId: "early",
      name: "Awal",
    });
  });
});
