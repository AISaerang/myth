"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DecisionType } from "@/generated/prisma/client";
import { DECISION_TYPE_LABEL } from "@/lib/rehearsal-labels";
import { createDecisionAction } from "@server/actions/operations";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const TYPES = Object.keys(DECISION_TYPE_LABEL) as DecisionType[];

export function CreateDecisionForm({
  eventId,
  songs,
  rehearsals,
}: {
  eventId: string;
  songs: { id: string; title: string }[];
  rehearsals: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(createDecisionAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <Card title="Catat keputusan">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="dec-title" className="text-sm font-medium">
              Judul
            </label>
            <input
              id="dec-title"
              name="title"
              required
              minLength={3}
              maxLength={150}
              placeholder="cth. Key lagu pembuka"
              defaultValue=""
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dec-type" className="text-sm font-medium">
              Jenis
            </label>
            <select id="dec-type" name="decisionType" defaultValue="MUSICAL" className={inputClass}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {DECISION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dec-text" className="text-sm font-medium">
            Keputusan
          </label>
          <textarea
            id="dec-text"
            name="decisionText"
            required
            rows={2}
            maxLength={5000}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="dec-reason" className="text-sm font-medium">
              Alasan (opsional)
            </label>
            <input id="dec-reason" name="reason" maxLength={2000} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dec-by" className="text-sm font-medium">
              Diputuskan oleh (opsional)
            </label>
            <input id="dec-by" name="decidedBy" maxLength={100} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dec-song" className="text-sm font-medium">
              Lagu terkait (opsional)
            </label>
            <select id="dec-song" name="relatedSongId" defaultValue="" className={inputClass}>
              <option value="">Tanpa lagu</option>
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex max-w-xs flex-col gap-1">
          <label htmlFor="dec-reh" className="text-sm font-medium">
            Rehearsal terkait (opsional)
          </label>
          <select id="dec-reh" name="relatedRehearsalId" defaultValue="" className={inputClass}>
            <option value="">Tanpa rehearsal</option>
            {rehearsals.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        {state.ok ? (
          <Alert tone="info">
            Keputusan tercatat. Catatan bersifat arsip dan tidak diubah.
          </Alert>
        ) : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Mencatat…" : "Catat keputusan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
