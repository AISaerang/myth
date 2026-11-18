import { describe, expect, it } from "vitest";
import type { BatchCatalog } from "@/lib/batch-badge";
import { resolveMedleyNav } from "@/lib/medley-nav";
import { medleyLabelSchema } from "@/lib/validation/song";

const catalog: BatchCatalog[] = [
  {
    id: "b1",
    name: "B1",
    status: "PUBLISHED",
    createdAt: new Date("2026-10-15T00:00:00Z"),
    items: [
      {
        songId: "a",
        title: "Pembuka",
        sortOrder: 0,
        isPublished: true,
        medleyGroupId: "med-1",
        medleyLabel: "Medley Pembuka",
      },
      {
        songId: "b",
        title: "Tengah",
        sortOrder: 1,
        isPublished: true,
        medleyGroupId: "med-1",
        medleyLabel: "Medley Pembuka",
      },
      {
        songId: "c",
        title: "Penutup",
        sortOrder: 2,
        isPublished: true,
        medleyGroupId: "med-1",
        medleyLabel: "Medley Pembuka",
      },
      {
        songId: "d",
        title: "Tunggal",
        sortOrder: 3,
        isPublished: true,
        medleyGroupId: null,
        medleyLabel: null,
      },
      {
        songId: "draft",
        title: "Draft",
        sortOrder: 4,
        isPublished: false,
        medleyGroupId: "med-2",
        medleyLabel: "Medley Draft",
      },
      {
        songId: "e",
        title: "Sesudah draft",
        sortOrder: 5,
        isPublished: true,
        medleyGroupId: "med-2",
        medleyLabel: "Medley Draft",
      },
    ],
  },
];

describe("medley navigation", () => {
  it("links to the next song inside a medley and hides back-to-badge", () => {
    const nav = resolveMedleyNav("a", catalog, { publishedOnly: true });
    expect(nav.back).toBeNull();
    expect(nav.next).toEqual([
      {
        songId: "b",
        title: "Tengah",
        medleyLabel: "Medley Pembuka",
        batchId: "b1",
        batchName: "B1",
      },
    ]);
  });

  it("offers back-to-badge only on the last medley song", () => {
    const nav = resolveMedleyNav("c", catalog, { publishedOnly: true });
    expect(nav.next).toEqual([]);
    expect(nav.back).toMatchObject({ badge: 3, anchorId: "badge-b1-3", batchName: "B1" });
  });

  it("offers back-to-badge for a song that is not in a medley", () => {
    const nav = resolveMedleyNav("d", catalog, { publishedOnly: true });
    expect(nav.next).toEqual([]);
    expect(nav.back?.badge).toBe(4);
    expect(nav.back?.anchorId).toBe("badge-b1-4");
  });

  it("skips unpublished songs when the viewer only sees published ones", () => {
    const nav = resolveMedleyNav("draft", catalog, { publishedOnly: true });
    expect(nav.next).toEqual([]);
    const admin = resolveMedleyNav("draft", catalog, { publishedOnly: false });
    expect(admin.next.map((link) => link.songId)).toEqual(["e"]);
    expect(admin.back).toBeNull();
  });

  it("follows batch sortOrder, not a separate setlist index", () => {
    const swapped: BatchCatalog[] = [
      {
        ...catalog[0]!,
        items: [
          { ...catalog[0]!.items[2]!, sortOrder: 0 },
          { ...catalog[0]!.items[0]!, sortOrder: 5 },
          { ...catalog[0]!.items[1]!, sortOrder: 9 },
        ],
      },
    ];
    const nav = resolveMedleyNav("c", swapped, { publishedOnly: true });
    expect(nav.next.map((link) => link.songId)).toEqual(["a"]);
    expect(nav.back).toBeNull();
  });
});

describe("medleyLabelSchema", () => {
  it("accepts an empty label so the song can leave the corridor", () => {
    const parsed = medleyLabelSchema.safeParse({
      batchId: "b1",
      songId: "a",
      label: "  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.label).toBe("");
  });

  it("rejects a label longer than 80 characters", () => {
    expect(
      medleyLabelSchema.safeParse({
        batchId: "b1",
        songId: "a",
        label: "m".repeat(81),
      }).success,
    ).toBe(false);
  });
});
