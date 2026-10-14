"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { BatchStatus } from "@/generated/prisma/client";
import { BATCH_STATUS_LABEL, canTransitionBatch } from "@/lib/batch-status";
import {
  addSongToBatchAction,
  removeSongFromBatchAction,
  setBatchStatusAction,
} from "@server/actions/batches";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const ALL_STATUSES: BatchStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "REVIEWING",
  "COMPLETED",
  "ARCHIVED",
];

export function BatchStatusChanger({
  batchId,
  current,
}: {
  batchId: string;
  current: BatchStatus;
}) {
  const [state, formAction, pending] = useActionState(setBatchStatusAction, {
    ok: false,
  });
  const next = ALL_STATUSES.filter(
    (s) => s !== current && canTransitionBatch(current, s),
  );
  if (next.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <form key={s} action={formAction}>
            <input type="hidden" name="batchId" value={batchId} />
            <input type="hidden" name="status" value={s} />
            <Button type="submit" variant="secondary" size="sm" disabled={pending}>
              {BATCH_STATUS_LABEL[s]}
            </Button>
          </form>
        ))}
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Status batch diubah.</Alert> : null}
    </div>
  );
}

export function AddSongForm({
  batchId,
  songs,
}: {
  batchId: string;
  songs: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(addSongToBatchAction, {
    ok: false,
  });
  if (songs.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Semua lagu event ini sudah ada di batch.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="batchId" value={batchId} />
        <select name="songId" aria-label="Pilih lagu" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Pilih lagu…
          </option>
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Tambah ke batch"}
        </Button>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </div>
  );
}

export function RemoveSongButton({
  batchId,
  songId,
  title,
}: {
  batchId: string;
  songId: string;
  title: string;
}) {
  const [, formAction, pending] = useActionState(removeSongFromBatchAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="songId" value={songId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Keluarkan ${title} dari batch`}
        className="rounded px-1 text-xs text-zinc-500 underline hover:text-red-600"
      >
        keluarkan
      </button>
    </form>
  );
}
