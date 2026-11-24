import Link from "next/link";
import { BatchOrderBadge } from "@/components/BatchOrderBadge";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SongStatusBadge } from "@/app/(app)/songs/SongStatusBadge";
import { groupSongsByBatchBadge } from "@/lib/batch-badge";
import { listEventBatchCatalog } from "@server/services/batch-service";
import {
  listPublishedSongsForMember,
  listSongs,
} from "@server/services/song-service";
import { loadGuestContext } from "../guest-context";

export default async function GuestSongsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await loadGuestContext(token);
  if (!guest.ok) return null;

  const { link } = guest.context;
  const [songs, catalog] = await Promise.all([
    link.includeDrafts
      ? listSongs(link.eventId)
      : listPublishedSongsForMember(link.eventId),
    listEventBatchCatalog(link.eventId),
  ]);
  const groups = groupSongsByBatchBadge(songs, catalog);
  const base = `/e/${token}/tamu/lagu`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Lagu</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {link.includeDrafts
            ? "Tautan ini menampilkan draft internal. Data draft belum final."
            : "Hanya lagu yang sudah dipublish yang tampil di sini."}
        </p>
      </div>

      {songs.length === 0 ? (
        <EmptyState
          title="Belum ada lagu"
          description="Lagu yang dapat dilihat tamu akan tampil di sini."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card
              key={group.batchId ?? "tanpa-batch"}
              title={group.batchName ?? "Tanpa batch"}
            >
              <ul className="flex flex-col gap-2">
                {group.rows.map((row) => (
                  <li
                    key={row.song.id}
                    id={row.anchorId ?? undefined}
                    className="scroll-mt-24"
                  >
                    <Link
                      href={`${base}/${row.song.id}${group.batchId ? `?${new URLSearchParams({ batchId: group.batchId }).toString()}` : ""}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {row.badge != null ? (
                          <BatchOrderBadge badge={row.badge} />
                        ) : null}
                        <span className="min-w-0">
                          <span className="font-medium">{row.song.title}</span>
                          <span className="block text-xs text-zinc-500">
                            {[
                              row.song.key ? `Key ${row.song.key}` : null,
                              row.song.bpm ? `${row.song.bpm} BPM` : null,
                              row.song.liturgicalFunction,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                          {row.medleyLabel ? (
                            <span className="block text-xs text-zinc-500">
                              Medley: {row.medleyLabel}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        {!row.song.isPublished ? (
                          <Badge tone="neutral">Draft internal</Badge>
                        ) : null}
                        <SongStatusBadge status={row.song.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
