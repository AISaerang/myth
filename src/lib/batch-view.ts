type BatchSongVisibility = {
  song: {
    isPublished: boolean;
    archivedAt: Date | null;
  };
};

export function canManageBatchUi(canWrite: boolean, preview: boolean): boolean {
  return canWrite && !preview;
}

export function publishedBatchItems<T extends BatchSongVisibility>(
  items: readonly T[],
): T[] {
  return items.filter(
    (item) => item.song.isPublished && item.song.archivedAt === null,
  );
}

export function isBatchReadable<T extends BatchSongVisibility>(batch: {
  status: string;
  items: readonly T[];
}): boolean {
  return (
    batch.status !== "ARCHIVED" &&
    publishedBatchItems(batch.items).length > 0
  );
}
