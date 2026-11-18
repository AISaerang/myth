import { describe, expect, it } from "vitest";
import type { BatchCatalog } from "@/lib/batch-badge";
import { resolveSetlistNav } from "@/lib/setlist-nav";

const catalog: BatchCatalog[] = [
  {
    id: "batch-a",
    name: "Batch A",
    status: "PUBLISHED",
    createdAt: new Date("2026-10-01T00:00:00Z"),
    items: [
      { songId: "one", title: "Satu", sortOrder: 0, isPublished: true },
      { songId: "two", title: "Dua", sortOrder: 1, isPublished: true },
      { songId: "draft", title: "Draft", sortOrder: 2, isPublished: false },
      { songId: "three", title: "Tiga", sortOrder: 3, isPublished: true },
      {
        songId: "archived",
        title: "Arsip",
        sortOrder: 4,
        isPublished: true,
        archived: true,
      },
    ],
  },
  {
    id: "batch-b",
    name: "Batch B",
    status: "PUBLISHED",
    createdAt: new Date("2026-10-02T00:00:00Z"),
    items: [{ songId: "two", title: "Dua", sortOrder: 2, isPublished: true }],
  },
];

describe("resolveSetlistNav", () => {
  it("returns previous and next links for the middle song", () => {
    expect(resolveSetlistNav("two", catalog, { publishedOnly: false })).toMatchObject({
      batch: { id: "batch-a", name: "Batch A", anchorId: "badge-batch-a-2" },
      position: 2,
      total: 4,
      prev: { songId: "one", title: "Satu", badge: 1 },
      next: { songId: "draft", title: "Draft", badge: 3 },
    });
  });

  it("skips drafts and archived songs for members", () => {
    const nav = resolveSetlistNav("three", catalog, { publishedOnly: true });
    expect(nav.position).toBe(3);
    expect(nav.total).toBe(3);
    expect(nav.prev?.songId).toBe("two");
    expect(nav.next).toBeNull();
  });

  it("shows drafts to admins and returns first/last positions", () => {
    const first = resolveSetlistNav("one", catalog, { publishedOnly: false });
    const last = resolveSetlistNav("archived", catalog, { publishedOnly: false });
    expect(first).toMatchObject({ position: 1, prev: null, next: { songId: "two" } });
    expect(last).toMatchObject({ position: 0, total: 0, batch: null });
  });

  it("uses a valid batchId and lists the other batches", () => {
    const nav = resolveSetlistNav("two", catalog, {
      publishedOnly: true,
      batchId: "batch-b",
    });
    expect(nav).toMatchObject({
      batch: { id: "batch-b", anchorId: "badge-batch-b-1" },
      position: 1,
      total: 1,
      otherBatches: [{ id: "batch-a", name: "Batch A" }],
    });
  });

  it("falls back to the first ordered batch when batchId is invalid", () => {
    expect(
      resolveSetlistNav("two", catalog, {
        publishedOnly: true,
        batchId: "missing",
      }).batch?.id,
    ).toBe("batch-a");
  });

  it("returns no navigation for a song that is not in a batch", () => {
    expect(resolveSetlistNav("unbatched", catalog, { publishedOnly: true })).toEqual({
      batch: null,
      position: 0,
      total: 0,
      prev: null,
      next: null,
      otherBatches: [],
    });
  });
});
