"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { PracticeStatus } from "@/generated/prisma/client";
import { PRACTICE_STATUS_LABEL, PRACTICE_STATUS_ORDER } from "@/lib/practice-status";
import {
  correctProgressAction,
  updateMyProgressAction,
} from "@server/actions/work";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function StatusSelect({
  defaultValue,
  id,
}: {
  defaultValue?: PracticeStatus;
  id: string;
}) {
  return (
    <select
      id={id}
      name="status"
      defaultValue={defaultValue ?? "NOT_STARTED"}
      className={inputClass}
    >
      {PRACTICE_STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {PRACTICE_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

export function MyProgressForm({
  songId,
  current,
}: {
  songId: string;
  current: { status: PracticeStatus; note: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(updateMyProgressAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="songId" value={songId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="my-progress-status" className="text-sm font-medium">
          Status latihanmu
        </label>
        <StatusSelect id="my-progress-status" defaultValue={current?.status} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="my-progress-note" className="text-sm font-medium">
          Catatan / kendala (opsional)
        </label>
        <textarea
          id="my-progress-note"
          name="note"
          rows={2}
          maxLength={1000}
          defaultValue={current?.note ?? ""}
          placeholder="cth. Transisi verse–chorus masih ragu"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Progres tersimpan.</Alert> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Update progres"}
        </Button>
      </div>
    </form>
  );
}

export function CorrectProgressForm({
  songId,
  personId,
  personName,
  current,
}: {
  songId: string;
  personId: string;
  personName: string;
  current?: PracticeStatus;
}) {
  const [state, formAction, pending] = useActionState(correctProgressAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="personId" value={personId} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`correct-${personId}`} className="sr-only text-sm font-medium">
          Koreksi progres {personName}
        </label>
        <StatusSelect id={`correct-${personId}`} defaultValue={current} />
      </div>
      <input
        name="note"
        aria-label={`Catatan koreksi ${personName}`}
        placeholder="Catatan (opsional)"
        maxLength={1000}
        className={`${inputClass} min-w-40 flex-1`}
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : "Koreksi"}
      </Button>
      {!state.ok && state.error ? (
        <span className="w-full">
          <Alert tone="danger">{state.error}</Alert>
        </span>
      ) : null}
    </form>
  );
}
