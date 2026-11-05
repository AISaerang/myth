// Badge lagu untuk POV pemusik = urutan item di dalam SongBatch
// (SongBatchItem.sortOrder), bukan EventSong.sortOrder setlist dan
// bukan SongStatus. Angka yang tampil adalah peringkat 1…N pada daftar
// admin batch (item diurut sortOrder), jadi lagu 1 di admin = badge 1.

export interface BatchCatalogItem {
  songId: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface RankedBatchItem extends BatchCatalogItem {
  badge: number;
  anchorId: string;
}

export interface BatchCatalog {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  items: BatchCatalogItem[];
}

export interface BatchBadgeRef {
  batchId: string;
  batchName: string;
  sortOrder: number;
  badge: number;
  anchorId: string;
}

export interface GroupedSongRow<T> {
  song: T;
  badge: number | null;
  anchorId: string | null;
  sortOrder: number | null;
}

export interface SongBadgeGroup<T> {
  batchId: string | null;
  batchName: string | null;
  archived: boolean;
  rows: GroupedSongRow<T>[];
}

export function batchBadgeAnchor(batchId: string, badge: number): string {
  return `badge-${batchId}-${badge}`;
}

/** 1-based rank of one SongBatchItem.sortOrder among the batch's items. */
export function badgeFromSortOrders(
  sortOrder: number,
  sortOrders: readonly number[],
): number {
  const ranked = [...sortOrders].sort((a, b) => a - b);
  const index = ranked.indexOf(sortOrder);
  return index === -1 ? sortOrder + 1 : index + 1;
}

export function withBadges(batch: BatchCatalog): RankedBatchItem[] {
  const sortOrders = batch.items.map((item) => item.sortOrder);
  return batch.items.map((item) => {
    const badge = badgeFromSortOrders(item.sortOrder, sortOrders);
    return {
      ...item,
      badge,
      anchorId: batchBadgeAnchor(batch.id, badge),
    };
  });
}

function catalogOrder(catalog: readonly BatchCatalog[]): BatchCatalog[] {
  return [...catalog].sort((a, b) => {
    const archivedA = a.status === "ARCHIVED" ? 1 : 0;
    const archivedB = b.status === "ARCHIVED" ? 1 : 0;
    if (archivedA !== archivedB) return archivedA - archivedB;
    const byDate = a.createdAt.getTime() - b.createdAt.getTime();
    if (byDate !== 0) return byDate;
    return a.name.localeCompare(b.name, "id");
  });
}

export function groupSongsByBatchBadge<T extends { id: string }>(
  songs: readonly T[],
  catalog: readonly BatchCatalog[],
): SongBadgeGroup<T>[] {
  const byId = new Map(songs.map((song) => [song.id, song]));
  const placed = new Set<string>();
  const groups: SongBadgeGroup<T>[] = [];

  for (const batch of catalogOrder(catalog)) {
    const ranked = { items: withBadges(batch) };
    const rows: GroupedSongRow<T>[] = [];
    const items = [...ranked.items].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.songId.localeCompare(b.songId),
    );
    for (const item of items) {
      const song = byId.get(item.songId);
      if (!song) continue;
      placed.add(song.id);
      rows.push({
        song,
        badge: item.badge,
        anchorId: item.anchorId,
        sortOrder: item.sortOrder,
      });
    }
    if (rows.length === 0) continue;
    groups.push({
      batchId: batch.id,
      batchName: batch.name,
      archived: batch.status === "ARCHIVED",
      rows,
    });
  }

  const rest = songs.filter((song) => !placed.has(song.id));
  if (rest.length > 0) {
    groups.push({
      batchId: null,
      batchName: null,
      archived: false,
      rows: rest.map((song) => ({
        song,
        badge: null,
        anchorId: null,
        sortOrder: null,
      })),
    });
  }
  return groups;
}

export function badgesForSong(
  songId: string,
  catalog: readonly BatchCatalog[],
): BatchBadgeRef[] {
  const badges: BatchBadgeRef[] = [];
  for (const batch of catalogOrder(catalog)) {
    const item = withBadges(batch).find((row) => row.songId === songId);
    if (!item) continue;
    badges.push({
      batchId: batch.id,
      batchName: batch.name,
      sortOrder: item.sortOrder,
      badge: item.badge,
      anchorId: item.anchorId,
    });
  }
  return badges;
}
