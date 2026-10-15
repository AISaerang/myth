"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { deleteBatchAction } from "@server/actions/batches";

export function DeleteBatchButton({
  batchId,
  batchName,
}: {
  batchId: string;
  batchName: string;
}) {
  const [state, formAction, pending] = useActionState(deleteBatchAction, {
    ok: false,
  });
  return (
    <details>
      <summary className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium dark:border-zinc-700">
        Hapus
      </summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="batchId" value={batchId} />
        <span className="text-xs text-zinc-500">
          Yakin hapus permanen “{batchName}”? Tidak bisa dikembalikan.
        </span>
        <div>
          <Button type="submit" variant="danger" size="sm" disabled={pending}>
            {pending ? "…" : "Ya, hapus"}
          </Button>
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
      </form>
    </details>
  );
}
