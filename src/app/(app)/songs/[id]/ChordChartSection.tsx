"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatJakarta } from "@/lib/format";
import {
  deleteChordChartAction,
  saveChordChartAction,
  setChordChartActiveAction,
} from "@server/actions/chords";
import { ChordViewer } from "./ChordViewer";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export interface ChartView {
  id: string;
  content: string;
  baseKey: string;
  originalKey: string | null;
  label: string | null;
  isActive: boolean;
  createdAt: Date;
}

export function ChordChartSection({
  songId,
  admin,
  charts,
}: {
  songId: string;
  admin: boolean;
  charts: ChartView[];
}) {
  const active = charts.find((c) => c.isActive) ?? null;
  const history = charts.filter((c) => !c.isActive);
  return (
    <Card title="Lirik & Chord">
      {active ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            Basis {active.baseKey}
            {active.originalKey ? ` (dari ${active.originalKey})` : ""}
            {active.label ? ` · ${active.label}` : ""}
          </p>
          <ChordViewer content={active.content} baseKey={active.baseKey} />
        </div>
      ) : (
        <EmptyState
          title="Belum ada chord chart"
          description={
            admin
              ? "Tempel ChordPro di bawah (otomatis dinormalisasi ke C)."
              : "MD akan mengunggah lirik & chord lagu ini."
          }
        />
      )}
      {admin ? (
        <div className="mt-4 flex flex-col gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <ChartInputForm songId={songId} />
          {history.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Riwayat (nonaktif)</p>
              <ul className="flex flex-col gap-1">
                {history.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                  >
                    <span>
                      {c.label ?? "Tanpa label"}{" "}
                      <span className="text-zinc-500">
                        · asal {c.originalKey ?? "?"} ·{" "}
                        {formatJakarta(c.createdAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="neutral">Arsip</Badge>
                      <ChartRowActions songId={songId} chartId={c.id} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function ChartInputForm({ songId }: { songId: string }) {
  const [state, formAction, pending] = useActionState(saveChordChartAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="songId" value={songId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="chart-key" className="text-sm font-medium">
            Nada dasar asal (dari internet)
          </label>
          <input
            id="chart-key"
            name="originalKey"
            required
            maxLength={8}
            placeholder="cth. G"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="chart-label" className="text-sm font-medium">
            Label (opsional)
          </label>
          <input
            id="chart-label"
            name="label"
            maxLength={50}
            placeholder="cth. Versi latihan v1"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="chart-content" className="text-sm font-medium">
          ChordPro — chord di dalam [kurung], mis. Bapa [G]sentuh ha[D]tiku
        </label>
        <textarea
          id="chart-content"
          name="content"
          required
          rows={10}
          placeholder={"[G]Betapa kumencintai\n[Em]segala yang telah terjadi"}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? (
        <Alert tone="info">Chart disimpan dan dinormalisasi ke C.</Alert>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Simpan chart (jadi C)"}
        </Button>
      </div>
    </form>
  );
}

function ChartRowActions({
  songId,
  chartId,
}: {
  songId: string;
  chartId: string;
}) {
  const [actState, actAction, actPending] = useActionState(
    setChordChartActiveAction,
    { ok: false },
  );
  const [delState, delAction, delPending] = useActionState(
    deleteChordChartAction,
    { ok: false },
  );
  return (
    <span className="flex items-center gap-2">
      <form action={actAction}>
        <input type="hidden" name="chartId" value={chartId} />
        <input type="hidden" name="songId" value={songId} />
        <Button type="submit" variant="secondary" size="sm" disabled={actPending}>
          Aktifkan
        </Button>
      </form>
      <form action={delAction}>
        <input type="hidden" name="chartId" value={chartId} />
        <input type="hidden" name="songId" value={songId} />
        <Button type="submit" variant="danger" size="sm" disabled={delPending}>
          Hapus
        </Button>
      </form>
      {!actState.ok && actState.error ? (
        <Alert tone="danger">{actState.error}</Alert>
      ) : null}
      {!delState.ok && delState.error ? (
        <Alert tone="danger">{delState.error}</Alert>
      ) : null}
    </span>
  );
}
