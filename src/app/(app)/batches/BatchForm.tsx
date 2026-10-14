"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createBatchAction, updateBatchAction } from "@server/actions/batches";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export interface BatchFormDefaults {
  name?: string;
  description?: string | null;
  releaseAt?: string;
  targetReviewAt?: string;
}

export function BatchForm({
  mode,
  eventId,
  batchId,
  defaults,
}: {
  mode: "create" | "edit";
  eventId?: string;
  batchId?: string;
  defaults?: BatchFormDefaults;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createBatchAction : updateBatchAction,
    { ok: false },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const d = defaults ?? {};

  useEffect(() => {
    if (state.ok && mode === "create") formRef.current?.reset();
  }, [state, mode]);

  return (
    <Card title={mode === "create" ? "Buat batch" : "Ubah batch"}>
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        {mode === "create" ? (
          <input type="hidden" name="eventId" value={eventId} />
        ) : (
          <input type="hidden" name="batchId" value={batchId} />
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            Nama batch
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="cth. Batch 1 — Praise"
            defaultValue={d.name ?? ""}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="releaseAt" className="text-sm font-medium">
              Tanggal rilis
            </label>
            <input
              id="releaseAt"
              name="releaseAt"
              type="date"
              defaultValue={d.releaseAt ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="targetReviewAt" className="text-sm font-medium">
              Target review
            </label>
            <input
              id="targetReviewAt"
              name="targetReviewAt"
              type="date"
              defaultValue={d.targetReviewAt ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            Deskripsi
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={d.description ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        {mode === "edit" && state.ok ? (
          <Alert tone="info">Perubahan disimpan.</Alert>
        ) : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : mode === "create" ? "Buat batch" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
