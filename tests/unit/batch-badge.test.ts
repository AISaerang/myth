import { describe, expect, it } from "vitest";
import {
  badgeFromSortOrders,
  badgesForSong,
  batchBadgeAnchor,
  groupSongsByBatchBadge,
  type BatchCatalog,
} from "@/lib/batch-badge";

const t = (iso: string) => new Date(iso);

function batch(
  partial: Omit<BatchCatalog, "createdAt"> & { createdAt?: Date },
): BatchCatalog {
  return { createdAt: t("2026-10-01T00:00:00Z"), ...partial };
}

describe("batch badge", () => {
  it("numbers 1…N by SongBatchItem.sortOrder rank, not the raw value", () => {
    expect(badgeFromSortOrders(0, [0, 1, 2])).toBe(1);
    expect(badgeFromSortOrders(1, [0, 1, 2])).toBe(2);
    expect(badgeFromSortOrders(2, [0, 1, 2])).toBe(3);
  });

  it("keeps admin rank when sortOrder has gaps", () => {
    expect(badgeFromSortOrders(0, [0, 2, 5])).toBe(1);
    expect(badgeFromSortOrders(2, [0, 2, 5])).toBe(2);
    expect(badgeFromSortOrders(5, [0, 2, 5])).toBe(3);
  });

  it("builds a stable anchor from the batch and badge", () => {
    expect(batchBadgeAnchor("batch-b1", 2)).toBe("badge-batch-b1-2");
  });

  it("orders the member list by batch then badge, ignoring setlist order", () => {
    const songs = [
      { id: "song-c", title: "C", setlistOrder: 0 },
      { id: "song-a", title: "A", setlistOrder: 2 },
      { id: "song-b", title: "B", setlistOrder: 1 },
      { id: "song-free", title: "Tanpa batch", setlistOrder: 9 },
    ];
    const catalog: BatchCatalog[] = [
      batch({
        id: "b2",
        name: "B2",
        status: "PUBLISHED",
        createdAt: t("2026-10-17T00:00:00Z"),
        items: [{ songId: "song-c", sortOrder: 0, isPublished: true }],
      }),
      batch({
        id: "b1",
        name: "B1",
        status: "PUBLISHED",
        createdAt: t("2026-10-15T00:00:00Z"),
        items: [
          { songId: "song-b", sortOrder: 1, isPublished: true },
          { songId: "song-a", sortOrder: 0, isPublished: true },
        ],
      }),
    ];
    const groups = groupSongsByBatchBadge(songs, catalog);
    expect(groups.map((group) => group.batchName)).toEqual(["B1", "B2", null]);
    expect(groups[0]?.rows.map((row) => [row.song.id, row.badge])).toEqual([
      ["song-a", 1],
      ["song-b", 2],
    ]);
    expect(groups[1]?.rows.map((row) => row.badge)).toEqual([1]);
    expect(groups[2]?.rows.map((row) => row.song.id)).toEqual(["song-free"]);
    expect(groups[0]?.rows[0]?.anchorId).toBe("badge-b1-1");
  });

  it("repeats a song that sits in two batches, each with its own badge", () => {
    const songs = [{ id: "song-a", title: "A" }];
    const catalog: BatchCatalog[] = [
      batch({
        id: "b1",
        name: "B1",
        status: "PUBLISHED",
        items: [
          { songId: "song-a", sortOrder: 1, isPublished: true },
          { songId: "other", sortOrder: 0, isPublished: false },
        ],
      }),
      batch({
        id: "b2",
        name: "B2",
        status: "PUBLISHED",
        createdAt: t("2026-10-20T00:00:00Z"),
        items: [{ songId: "song-a", sortOrder: 0, isPublished: true }],
      }),
    ];
    const groups = groupSongsByBatchBadge(songs, catalog);
    expect(groups.map((group) => group.rows[0]?.badge)).toEqual([2, 1]);
    expect(badgesForSong("song-a", catalog).map((badge) => badge.badge)).toEqual([
      2, 1,
    ]);
  });

  it("does not use a field named like setlist order", () => {
    const catalog: BatchCatalog[] = [
      batch({
        id: "b1",
        name: "B1",
        status: "PUBLISHED",
        items: [{ songId: "song-a", sortOrder: 4, isPublished: true }],
      }),
    ];
    expect(badgesForSong("song-a", catalog)[0]?.badge).toBe(1);
    expect(badgesForSong("missing", catalog)).toEqual([]);
  });
});
