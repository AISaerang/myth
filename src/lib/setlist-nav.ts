import {
  batchBadgeAnchor,
  orderBatchCatalog,
  withBadges,
  type BatchCatalog,
} from "@/lib/batch-badge";

export interface SetlistNavLink {
  songId: string;
  title: string;
  badge: number;
}

export interface SetlistNavBatch {
  id: string;
  name: string;
  anchorId: string;
}

export interface SetlistNavResult {
  batch: SetlistNavBatch | null;
  position: number;
  total: number;
  prev: SetlistNavLink | null;
  next: SetlistNavLink | null;
  otherBatches: { id: string; name: string }[];
}

export function resolveSetlistNav(
  songId: string,
  catalog: readonly BatchCatalog[],
  options: { publishedOnly: boolean; batchId?: string },
): SetlistNavResult {
  const orderedBatches = orderBatchCatalog(catalog);
  const memberships = orderedBatches.flatMap((batch) => {
    const items = [...withBadges(batch)]
      .filter(
        (item) =>
          !item.archived && (!options.publishedOnly || item.isPublished),
      )
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.songId.localeCompare(b.songId),
      );
    return items.some((item) => item.songId === songId)
      ? [{ batch, items }]
      : [];
  });

  const selected =
    memberships.find(({ batch }) => batch.id === options.batchId) ??
    memberships[0];
  if (!selected) {
    return {
      batch: null,
      position: 0,
      total: 0,
      prev: null,
      next: null,
      otherBatches: [],
    };
  }

  const position = selected.items.findIndex((item) => item.songId === songId);
  const current = selected.items[position];
  if (!current) {
    return {
      batch: null,
      position: 0,
      total: 0,
      prev: null,
      next: null,
      otherBatches: [],
    };
  }

  const toLink = (item: (typeof selected.items)[number] | undefined) =>
    item
      ? {
          songId: item.songId,
          title: item.title?.trim() || "Lagu",
          badge: item.badge,
        }
      : null;

  return {
    batch: {
      id: selected.batch.id,
      name: selected.batch.name,
      anchorId: batchBadgeAnchor(selected.batch.id, current.badge),
    },
    position: position + 1,
    total: selected.items.length,
    prev: toLink(selected.items[position - 1]),
    next: toLink(selected.items[position + 1]),
    otherBatches: memberships
      .filter(({ batch }) => batch.id !== selected.batch.id)
      .map(({ batch }) => ({ id: batch.id, name: batch.name })),
  };
}
