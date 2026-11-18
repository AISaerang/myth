"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ChartViewPreferenceProvider,
  ChordViewer,
  type ChartDisplaySection,
} from "@/app/(app)/songs/[id]/ChordViewer";
import { MedleyTransitionForm } from "./MedleyTransitionForm";

interface SheetSong {
  id: string;
  title: string;
  key: string;
  sections: ChartDisplaySection[];
  content: string | null;
  transition: { content: string; notes: string | null } | null;
}

export function MedleyJoinedSheet({
  batchId,
  groupId,
  label,
  songs,
  canWrite,
}: {
  batchId: string;
  groupId: string;
  label: string;
  songs: SheetSong[];
  canWrite: boolean;
}) {
  return (
    <ChartViewPreferenceProvider
      preferenceKey={`myth-medley:${batchId}:${groupId}`}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href={`/batches/${batchId}`}
            className="text-sm font-medium underline"
          >
            ← Kembali ke batch
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{label}</h1>
          <p className="text-sm text-zinc-500">
            Sheet gabungan mengikuti urutan lagu di batch. Preferensi nada dan
            mode tampilan berlaku untuk seluruh medley ini.
          </p>
        </div>
        {songs.map((song, index) => {
          const next = songs[index + 1];
          return (
            <div key={song.id} className="flex flex-col gap-3">
              <Card title={`${index + 1}. ${song.title} · ${song.key}`}>
                {song.sections.length > 0 ? (
                  <ChordViewer
                    content={song.sections.map((section) => section.content).join("\n\n")}
                    baseKey={song.key}
                    sections={song.sections}
                  />
                ) : song.content ? (
                  <ChordViewer content={song.content} baseKey={song.key} />
                ) : (
                  <EmptyState
                    title="Chart belum tersedia"
                    description="MD belum menambahkan lirik atau chord untuk lagu ini."
                  />
                )}
              </Card>
              {next ? (
                <Card title={`Transisi · ${song.title} → ${next.title}`}>
                  {song.transition ? (
                    <div className="flex flex-col gap-2">
                      <ChordViewer
                        content={song.transition.content}
                        baseKey={song.key}
                      />
                      {song.transition.notes ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {song.transition.notes}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Belum ada catatan transisi.
                    </p>
                  )}
                  {canWrite ? (
                    <div className="mt-3">
                      <MedleyTransitionForm
                        batchId={batchId}
                        fromSongId={song.id}
                        toSongId={next.id}
                        initialContent={song.transition?.content}
                        initialNotes={song.transition?.notes}
                      />
                    </div>
                  ) : null}
                </Card>
              ) : null}
            </div>
          );
        })}
      </div>
    </ChartViewPreferenceProvider>
  );
}
