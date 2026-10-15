"use client";

import { useActionState } from "react";
import { reorderBatchItemsAction } from "@server/actions/batches";
import { reorderRehearsalSongsAction } from "@server/actions/operations";

function swapped(ids: string[], index: number, dir: -1 | 1): string[] {
  const next = [...ids];
  const j = index + dir;
  const tmp = next[index] as string;
  next[index] = next[j] as string;
  next[j] = tmp;
  return next;
}

function Mover({
  orderedIds,
  index,
  total,
  hiddenName,
  hiddenId,
  idValue,
  action,
  label,
}: {
  orderedIds: string[];
  index: number;
  total: number;
  hiddenName: "batchId" | "rehearsalId";
  hiddenId: string;
  idValue: string;
  action: (
    prev: { ok: boolean; error?: string },
    formData: FormData,
  ) => Promise<{ ok: boolean; error?: string }>;
  label: string;
}) {
  const [, formAction, pending] = useActionState(action, { ok: false });
  const btn =
    "min-h-[44px] min-w-[44px] rounded-lg border border-zinc-300 px-2 text-sm dark:border-zinc-700 disabled:opacity-30";
  return (
    <span className="flex items-center gap-1" role="group" aria-label={`Urutkan ${label}`}>
      <form action={formAction}>
        <input type="hidden" name={hiddenName} value={idValue} />
        <input
          type="hidden"
          name="orderedIds"
          value={JSON.stringify(swapped(orderedIds, index, -1))}
        />
        <button
          type="submit"
          disabled={pending || index === 0}
          aria-label={`Naikkan ${label}`}
          className={btn}
        >
          ↑
        </button>
      </form>
      <form action={formAction}>
        <input type="hidden" name={hiddenName} value={idValue} />
        <input
          type="hidden"
          name="orderedIds"
          value={JSON.stringify(swapped(orderedIds, index, 1))}
        />
        <button
          type="submit"
          disabled={pending || index === total - 1}
          aria-label={`Turunkan ${label}`}
          className={btn}
        >
          ↓
        </button>
      </form>
      <span className="sr-only" aria-live="polite">
        {hiddenId}
      </span>
    </span>
  );
}

export function BatchItemMover({
  batchId,
  orderedIds,
  index,
  title,
}: {
  batchId: string;
  orderedIds: string[];
  index: number;
  title: string;
}) {
  return (
    <Mover
      orderedIds={orderedIds}
      index={index}
      total={orderedIds.length}
      hiddenName="batchId"
      hiddenId={batchId}
      idValue={batchId}
      action={reorderBatchItemsAction}
      label={title}
    />
  );
}

export function RehearsalSongMover({
  rehearsalId,
  orderedIds,
  index,
  title,
}: {
  rehearsalId: string;
  orderedIds: string[];
  index: number;
  title: string;
}) {
  return (
    <Mover
      orderedIds={orderedIds}
      index={index}
      total={orderedIds.length}
      hiddenName="rehearsalId"
      hiddenId={rehearsalId}
      idValue={rehearsalId}
      action={reorderRehearsalSongsAction}
      label={title}
    />
  );
}
