"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { saveMedleyTransitionAction } from "@server/actions/batches";

const fieldClass =
  "min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function MedleyTransitionForm({
  batchId,
  fromSongId,
  toSongId,
  initialContent,
  initialNotes,
}: {
  batchId: string;
  fromSongId: string;
  toSongId: string;
  initialContent?: string | null;
  initialNotes?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveMedleyTransitionAction,
    { ok: false },
  );
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="fromSongId" value={fromSongId} />
      <input type="hidden" name="toSongId" value={toSongId} />
      <label className="text-sm font-medium">
        Transisi musikal
        <textarea
          name="content"
          defaultValue={initialContent ?? ""}
          required
          maxLength={4000}
          rows={3}
          placeholder="Contoh: [G] tahan 2 bar, lalu cue masuk lagu berikutnya"
          className={`${fieldClass} mt-1`}
        />
      </label>
      <label className="text-sm">
        Catatan (opsional)
        <input
          name="notes"
          defaultValue={initialNotes ?? ""}
          maxLength={2000}
          className={`${fieldClass} mt-1`}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan transisi"}
        </Button>
        {initialContent ? (
          <button
            type="submit"
            name="remove"
            value="true"
            formAction={formAction}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-700 underline dark:text-red-300"
            disabled={pending}
          >
            Hapus transisi
          </button>
        ) : null}
      </div>
      {!state.ok && state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Perubahan transisi tersimpan.</Alert> : null}
    </form>
  );
}
