import type { BatchCatalogItem } from "@/lib/batch-badge";

export type MedleyBlock<T extends BatchCatalogItem> =
  | { kind: "song"; item: T }
  | {
      kind: "medley";
      groupId: string;
      label: string;
      items: T[];
    };

export function groupMedleyRuns<T extends BatchCatalogItem>(
  input: readonly T[],
): MedleyBlock<T>[] {
  const items = [...input].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.songId.localeCompare(b.songId),
  );
  const blocks: MedleyBlock<T>[] = [];
  let index = 0;
  while (index < items.length) {
    const item = items[index];
    if (!item) {
      index += 1;
      continue;
    }
    if (!item.medleyGroupId) {
      blocks.push({ kind: "song", item });
      index += 1;
      continue;
    }
    const run = [item];
    let cursor = index + 1;
    while (
      cursor < items.length &&
      items[cursor]?.medleyGroupId === item.medleyGroupId
    ) {
      const next = items[cursor];
      if (next) run.push(next);
      cursor += 1;
    }
    if (run.length < 2) {
      blocks.push({ kind: "song", item });
    } else {
      blocks.push({
        kind: "medley",
        groupId: item.medleyGroupId,
        label: item.medleyLabel?.trim() || "Medley",
        items: run,
      });
    }
    index = cursor;
  }
  return blocks;
}

export function visibleMedleyItems<T extends BatchCatalogItem>(
  items: readonly T[],
  publishedOnly: boolean,
): T[] {
  return items.map((item) =>
    item.archived || (publishedOnly && !item.isPublished)
      ? { ...item, medleyGroupId: null, medleyLabel: null }
      : item,
  );
}

export function isAdjacentMedleyPair(
  items: readonly BatchCatalogItem[],
  fromSongId: string,
  toSongId: string,
): boolean {
  const ordered = [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.songId.localeCompare(b.songId),
  );
  const index = ordered.findIndex((item) => item.songId === fromSongId);
  const from = ordered[index];
  const to = ordered[index + 1];
  return Boolean(
    from &&
      to &&
      to.songId === toSongId &&
      from.medleyGroupId &&
      from.medleyGroupId === to.medleyGroupId &&
      !from.archived &&
      !to.archived,
  );
}
