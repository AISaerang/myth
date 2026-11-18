"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BatchCatalogItem } from "@/lib/batch-badge";
import { groupMedleyRuns } from "@/lib/medley-groups";
import { Card } from "@/components/ui/Card";
import { MedleyTransitionForm } from "./MedleyTransitionForm";
import { MedleyLabelForm } from "./MedleyLabelForm";

type MedleyItem = BatchCatalogItem & {
  song: { title: string; status: string };
};

export function MedleyGroupCards({
  batchId,
  eventId,
  items,
  transitions,
  canWrite,
}: {
  batchId: string;
  eventId: string;
  items: MedleyItem[];
  transitions: {
    fromSongId: string;
    toSongId: string;
    content: string;
    notes: string | null;
  }[];
  canWrite: boolean;
}) {
  const blocks = groupMedleyRuns(items);
  const runs = blocks.filter((block) => block.kind === "medley");
  if (runs.length === 0 && !canWrite) return null;
  const transitionBySongId = new Map(
    transitions.map((transition) => [transition.fromSongId, transition]),
  );
  return (
    <Card title="Medley & transisi">
      {runs.length === 0 ? (
        <p className="text-sm text-zinc-500">Belum ada medley berurutan.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((run) => (
            <MedleyRunDetails
              key={`${run.groupId}-${run.items[0]?.songId}`}
              label={`${run.label} · ${run.items.length} lagu`}
            >
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {run.items.map((item) => (
                    <li key={item.songId}>
                      <Link
                        href={`/songs/${item.songId}?eventId=${eventId}&batchId=${batchId}`}
                        className="font-medium underline"
                      >
                        {item.song.title}
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link
                  href={`/batches/${batchId}/medley/${encodeURIComponent(
                    `${run.groupId}~${run.items[0]?.songId ?? ""}`,
                  )}`}
                  className="min-h-11 self-start rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium underline dark:border-zinc-700"
                >
                  Buka sheet gabungan
                </Link>
                {canWrite
                  ? run.items.slice(0, -1).map((item, index) => {
                      const next = run.items[index + 1];
                      if (!next) return null;
                      const saved = transitionBySongId.get(item.songId);
                      const transition =
                        saved?.toSongId === next.songId ? saved : undefined;
                      return (
                        <div key={`${item.songId}-${next.songId}`}>
                          <p className="mb-1 text-sm font-medium">
                            {item.song.title} → {next.song.title}
                          </p>
                          <MedleyTransitionForm
                            batchId={batchId}
                            fromSongId={item.songId}
                            toSongId={next.songId}
                            initialContent={transition?.content}
                            initialNotes={transition?.notes}
                          />
                        </div>
                      );
                    })
                  : null}
            </MedleyRunDetails>
          ))}
        </div>
      )}
      {canWrite ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold">Atur medley berurutan</h3>
          {items
            .filter((item) => !item.archived)
            .map((item) => (
              <div key={item.songId} className="flex flex-col gap-1">
                <p className="text-sm font-medium">{item.song.title}</p>
                <MedleyLabelForm
                  batchId={batchId}
                  songId={item.songId}
                  songTitle={item.song.title}
                  label={item.medleyLabel ?? null}
                />
              </div>
            ))}
        </div>
      ) : null}
      {canWrite ? (
        <p className="mt-3 text-xs text-zinc-500">
          Transisi hanya dapat disimpan di antara lagu berurutan dalam medley yang sama.
        </p>
      ) : null}
    </Card>
  );
}

function MedleyRunDetails({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const timer = window.setTimeout(() => setOpen(query.matches), 0);
    const update = (event: MediaQueryListEvent) => setOpen(event.matches);
    query.addEventListener("change", update);
    return () => {
      window.clearTimeout(timer);
      query.removeEventListener("change", update);
    };
  }, []);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <summary className="cursor-pointer font-medium">{label}</summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}
