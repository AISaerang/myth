"use client";

import Link from "next/link";
import { useCallback, useActionState, useRef, useState } from "react";
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
  updateChordChartAction,
} from "@server/actions/chords";
import type { ActionState } from "@server/actions/auth";
import { ChordOverUnderEditor } from "./ChordOverUnderEditor";
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
  arrangement,
}: {
  songId: string;
  admin: boolean;
  charts: ChartView[];
  arrangement: { name: string; content: string } | null;
}) {
  const active = charts.find((c) => c.isActive) ?? null;
  const history = charts.filter((c) => !c.isActive);

  const legacyAdmin = (
    <LegacyChartAdmin songId={songId} active={active} history={history} />
  );

  return (
    <Card title="Lirik & Chord">
      {admin ? (
        <div className="mb-3 flex justify-end">
          <Link
            href={`/songs/${songId}/chart`}
            className="text-sm font-medium underline"
          >
            Kelola bagian & aransemen
          </Link>
        </div>
      ) : null}

      {arrangement ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            Aransemen aktif:{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {arrangement.name}
            </span>
          </p>
          <ChordViewer content={arrangement.content} baseKey="C" />
        </div>
      ) : active ? (
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
              ? "Buka Kelola bagian & aransemen untuk membuat bagian pertama."
              : "MD akan mengunggah lirik & chord lagu ini."
          }
        />
      )}

      {admin ? (
        arrangement ? (
          <details className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <summary className="cursor-pointer text-sm font-medium">
              Chart lama & riwayat
            </summary>
            <p className="mt-2 text-xs text-zinc-500">
              Chart lama tidak dipakai selama aransemen aktif.
            </p>
            <div className="mt-3 flex flex-col gap-4">{legacyAdmin}</div>
          </details>
        ) : (
          legacyAdmin
        )
      ) : null}
    </Card>
  );
}

function LegacyChartAdmin({
  songId,
  active,
  history,
}: {
  songId: string;
  active: ChartView | null;
  history: ChartView[];
}) {
  return (
    <>
      {active ? <ChartEditPanel songId={songId} chart={active} /> : null}
      <div className="mt-4 flex flex-col gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-sm font-medium">Tambah versi baru</p>
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
    </>
  );
}

function ChartEditPanel({
  songId,
  chart,
}: {
  songId: string;
  chart: ChartView;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Tutup editor" : "Edit chart aktif"}
        </Button>
      </div>
      {editing ? <ChartEditForm songId={songId} chart={chart} /> : null}
    </div>
  );
}

function ChartEditForm({
  songId,
  chart,
}: {
  songId: string;
  chart: ChartView;
}) {
  const [state, formAction, pending] = useActionState(updateChordChartAction, {
    ok: false,
  });
  const [content, setContent] = useState(chart.content);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="chartId" value={chart.id} />
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`chart-edit-label-${chart.id}`}
          className="text-sm font-medium"
        >
          Label (opsional)
        </label>
        <input
          id={`chart-edit-label-${chart.id}`}
          name="label"
          maxLength={50}
          defaultValue={chart.label ?? ""}
          placeholder="cth. Versi latihan v1"
          className={inputClass}
        />
      </div>
      <ChordOverUnderEditor
        id={`chart-edit-content-${chart.id}`}
        name="content"
        heading={`Kunci & lirik — sudah basis ${chart.baseKey}`}
        defaultValue={chart.content}
        onChange={setContent}
        hint="Kunci di baris atas, lirik di baris bawah; atur posisi pakai spasi atau Tab."
      />
      {content.trim() ? (
        <details className="rounded-lg border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Preview tampilan final
          </summary>
          <div className="px-3 pb-3">
            <ChordViewer content={content} baseKey={chart.baseKey} />
          </div>
        </details>
      ) : null}
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Chart diperbarui.</Alert> : null}
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}

function ChartInputForm({ songId }: { songId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState("");
  const [originalKey, setOriginalKey] = useState("");
  const [resetToken, setResetToken] = useState(0);
  const reset = useCallback(() => {
    formRef.current?.reset();
    setContent("");
    setOriginalKey("");
    setResetToken((c) => c + 1);
  }, []);
  // Form direset lewat wrapper server action (bukan via effect) supaya editor
  // dan input kembali kosong setelah chart berhasil disimpan.
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    useCallback(async (prev: ActionState, formData: FormData) => {
      const result = await saveChordChartAction(prev, formData);
      if (result.ok) reset();
      return result;
    }, [reset]),
    { ok: false },
  );
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
            onChange={(event) => setOriginalKey(event.target.value)}
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
      <ChordOverUnderEditor
        key={resetToken}
        id="chart-content"
        name="content"
        heading={`Kunci & lirik dari internet${
          originalKey.trim() ? ` — nada ${originalKey.trim()}` : ""
        }`}
        onChange={setContent}
      />
      {content.trim() ? (
        <details className="rounded-lg border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Preview tampilan final
          </summary>
          <div className="px-3 pb-3">
            <ChordViewer
              content={content}
              baseKey={originalKey.trim().toUpperCase() || "C"}
            />
          </div>
        </details>
      ) : null}
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
