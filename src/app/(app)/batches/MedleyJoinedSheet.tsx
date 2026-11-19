"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ChartViewPreferenceProvider,
  ChordViewer,
  useChartViewPreferences,
  type ChartDisplaySection,
} from "@/app/(app)/songs/[id]/ChordViewer";
import { InstrumentPovBar } from "@/components/InstrumentPovBar";
import type { InstrumentChartData } from "@/lib/validation/instrument-chart";
import { MedleyTransitionForm } from "./MedleyTransitionForm";

interface SheetSong {
  id: string;
  title: string;
  key: string;
  sections: ChartDisplaySection[];
  content: string | null;
  defaultCapo: number;
  instrumentData: InstrumentChartData;
  roleTabs?: readonly { role: string; data: unknown }[];
  transition: { content: string; notes: string | null } | null;
}

function SharedMedleyInstrumentControls() {
  const preferences = useChartViewPreferences();
  return (
    <InstrumentPovBar
      instrumentPov={preferences.instrumentPov}
      onInstrumentPov={preferences.setInstrumentPov}
      resetToC={preferences.resetToC}
      onResetToC={() => {
        preferences.setResetToC(true);
        preferences.setOffset(0);
        preferences.setUseFlats(false);
      }}
      onReturnToSongKey={() => {
        preferences.setResetToC(false);
        preferences.setOffset(0);
      }}
      capo={0}
      defaultCapo={0}
      onCapo={() => undefined}
      capoMode="sounding"
      onCapoMode={() => undefined}
      showCapo={false}
    />
  );
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
            Sheet gabungan mengikuti urutan lagu di batch. Sudut pandang dan
            Reset ke C berlaku untuk seluruh medley; capo tetap per lagu.
          </p>
        </div>
        <SharedMedleyInstrumentControls />
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
                    songId={song.id}
                    defaultCapo={song.defaultCapo}
                    instrumentData={song.instrumentData}
                    roleTabs={song.roleTabs}
                    songPreferenceKey={`myth_chart_view:${song.id}`}
                    legacyPreferenceKey={`myth-chart:${song.id}`}
                    showPovControls={false}
                    showKeyControls={false}
                    showCapoControls
                  />
                ) : song.content ? (
                  <ChordViewer
                    content={song.content}
                    baseKey={song.key}
                    songId={song.id}
                    defaultCapo={song.defaultCapo}
                    instrumentData={song.instrumentData}
                    roleTabs={song.roleTabs}
                    songPreferenceKey={`myth_chart_view:${song.id}`}
                    legacyPreferenceKey={`myth-chart:${song.id}`}
                    showPovControls={false}
                    showKeyControls={false}
                    showCapoControls
                  />
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
                        showPovControls={false}
                        showKeyControls={false}
                        showCapoControls={false}
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
