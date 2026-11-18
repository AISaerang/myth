import { describe, expect, it } from "vitest";
import {
  groupMedleyRuns,
  isAdjacentMedleyPair,
  visibleMedleyItems,
} from "@/lib/medley-groups";
import type { BatchCatalogItem } from "@/lib/batch-badge";

const items: BatchCatalogItem[] = [
  { songId: "a", sortOrder: 0, isPublished: true, medleyGroupId: "g", medleyLabel: "Set" },
  { songId: "b", sortOrder: 1, isPublished: true, medleyGroupId: "g", medleyLabel: "Set" },
  { songId: "c", sortOrder: 2, isPublished: true, medleyGroupId: null, medleyLabel: null },
  { songId: "d", sortOrder: 3, isPublished: true, medleyGroupId: "g", medleyLabel: "Set" },
  { songId: "e", sortOrder: 4, isPublished: true, medleyGroupId: "solo", medleyLabel: "Solo" },
];

describe("groupMedleyRuns", () => {
  it("groups only consecutive items and splits legacy non-consecutive groups", () => {
    const result = groupMedleyRuns(items);
    expect(result.map((block) => block.kind)).toEqual([
      "medley",
      "song",
      "song",
      "song",
    ]);
    expect(result[0]).toMatchObject({
      kind: "medley",
      groupId: "g",
      label: "Set",
      items: [{ songId: "a" }, { songId: "b" }],
    });
  });

  it("keeps a run of one item as a normal song", () => {
    expect(groupMedleyRuns([items[4]!])).toEqual([
      { kind: "song", item: items[4] },
    ]);
  });

  it("does not bridge across a hidden or archived item", () => {
    const filtered = visibleMedleyItems(
      [
        items[0]!,
        { ...items[1]!, isPublished: false },
        { ...items[2]!, medleyGroupId: "g", medleyLabel: "Set" },
      ],
      true,
    );
    expect(groupMedleyRuns(filtered).map((block) => block.kind)).toEqual([
      "song",
      "song",
      "song",
    ]);

    const archived = visibleMedleyItems(
      [
        items[0]!,
        { ...items[1]!, archived: true },
        { ...items[2]!, medleyGroupId: "g", medleyLabel: "Set" },
      ],
      false,
    );
    expect(groupMedleyRuns(archived).map((block) => block.kind)).toEqual([
      "song",
      "song",
      "song",
    ]);
  });

  it("regroups after reorder using the new sort order", () => {
    const reordered = [
      { ...items[0]!, sortOrder: 0 },
      { ...items[2]!, sortOrder: 1 },
      { ...items[1]!, sortOrder: 2 },
    ];
    expect(groupMedleyRuns(reordered).map((block) => block.kind)).toEqual([
      "song",
      "song",
      "song",
    ]);
  });

  it("allows transition pairs only when currently adjacent in the same group", () => {
    expect(isAdjacentMedleyPair(items, "a", "b")).toBe(true);
    expect(isAdjacentMedleyPair(items, "b", "d")).toBe(false);
    expect(
      isAdjacentMedleyPair(
        [
          items[0]!,
          { ...items[1]!, isPublished: false },
          { ...items[2]!, medleyGroupId: "g", medleyLabel: "Set" },
        ],
        "a",
        "c",
      ),
    ).toBe(false);
  });
});
