"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { setBatchItemMedleyAction } from "@server/actions/batches";

const inputClass =
  "h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function MedleyLabelForm({
  batchId,
  songId,
  songTitle,
  label,
}: {
  batchId: string;
  songId: string;
  songTitle: string;
  label: string | null;
}) {
  const [state, formAction, pending] = useActionState(setBatchItemMedleyAction, {
    ok: false,
  });
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="batchId" value={batchId} />
        <input type="hidden" name="songId" value={songId} />
        <input
          name="label"
          aria-label={`Label medley untuk ${songTitle}`}
          defaultValue={label ?? ""}
          placeholder="Label medley (kosongkan bila bukan medley)"
          maxLength={80}
          className={inputClass}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan medley"}
        </Button>
      </form>
      {!state.ok && state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Label medley disimpan.</Alert> : null}
    </div>
  );
}
