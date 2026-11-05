import Link from "next/link";
import type { SongStatus } from "@/generated/prisma/client";
import { BatchOrderBadge } from "@/components/BatchOrderBadge";
import type { SongBadgeGroup } from "@/lib/batch-badge";
import { SongStatusBadge } from "./SongStatusBadge";

export interface BatchSongRow {
  id: string;
  title: string;
  liturgicalFunction: string | null;
  status: SongStatus;
}

export function BatchSongGroups({
  eventId,
  groups,
}: {
  eventId: string;
  groups: SongBadgeGroup<BatchSongRow>[];
}) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const heading =
          group.batchName == null
            ? "Belum masuk batch"
            : group.archived
              ? `${group.batchName} (arsip)`
              : group.batchName;
        const headingId = group.batchId
          ? `batch-heading-${group.batchId}`
          : "batch-heading-none";
        return (
          <section key={group.batchId ?? "none"} aria-labelledby={headingId}>
            <h2 id={headingId} className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {heading}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.rows.map((row) => (
                <li
                  key={`${group.batchId ?? "none"}-${row.song.id}`}
                  id={row.anchorId ?? undefined}
                  className="scroll-mt-24"
                >
                  <Link
                    href={`/songs/${row.song.id}?eventId=${eventId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {row.badge != null ? <BatchOrderBadge badge={row.badge} /> : null}
                      <span className="min-w-0">
                        <span className="font-medium">{row.song.title}</span>
                        {row.song.liturgicalFunction ? (
                          <span className="block text-xs text-zinc-500">
                            {row.song.liturgicalFunction}
                          </span>
                        ) : null}
                        {row.medleyLabel ? (
                          <span className="block text-xs text-zinc-500">
                            Medley: {row.medleyLabel}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <SongStatusBadge status={row.song.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
