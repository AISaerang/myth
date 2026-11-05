import {
  orderBatchCatalog,
  withBadges,
  type BatchCatalog,
} from "@/lib/batch-badge";

export interface MedleyNextLink {
  songId: string;
  title: string;
  medleyLabel: string;
  batchId: string;
  batchName: string;
}

export interface MedleyBackLink {
  badge: number;
  anchorId: string;
  batchId: string;
  batchName: string;
}

// Koridor = item satu batch dengan medleyGroupId sama, diurut
// SongBatchItem.sortOrder (badge). Lagu di tengah koridor hanya
// mendapat "lagu berikutnya". "Kembali ke badge" hanya bila tidak
// ada lagu berikutnya: lagu terakhir medley, atau lagu di luar medley.
export function resolveMedleyNav(
  songId: string,
  catalog: readonly BatchCatalog[],
  options: { publishedOnly: boolean },
): { next: MedleyNextLink[]; back: MedleyBackLink | null } {
  const next: MedleyNextLink[] = [];
  const ownBadges: MedleyBackLink[] = [];

  for (const batch of orderBatchCatalog(catalog)) {
    const items = [...withBadges(batch)].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.songId.localeCompare(b.songId),
    );
    const mine = items.find((item) => item.songId === songId);
    if (!mine) continue;
    ownBadges.push({
      badge: mine.badge,
      anchorId: mine.anchorId,
      batchId: batch.id,
      batchName: batch.name,
    });
    if (!mine.medleyGroupId) continue;

    const corridor = items.filter(
      (item) => item.medleyGroupId === mine.medleyGroupId && !item.archived,
    );
    const visible = options.publishedOnly
      ? corridor.filter((item) => item.isPublished)
      : corridor;
    const index = visible.findIndex((item) => item.songId === songId);
    const following = index === -1 ? undefined : visible[index + 1];
    if (!following) continue;
    next.push({
      songId: following.songId,
      title: following.title?.trim() || "Lagu berikutnya",
      medleyLabel: mine.medleyLabel?.trim() || "Medley",
      batchId: batch.id,
      batchName: batch.name,
    });
  }

  if (next.length > 0) return { next, back: null };
  return { next, back: ownBadges[0] ?? null };
}
