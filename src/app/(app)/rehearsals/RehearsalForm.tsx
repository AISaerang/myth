"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RehearsalStatus, RehearsalType } from "@/generated/prisma/client";
import { REHEARSAL_STATUS_LABEL, REHEARSAL_TYPE_LABEL } from "@/lib/rehearsal-labels";
import {
  createRehearsalAction,
  updateRehearsalAction,
} from "@server/actions/operations";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const TYPES = Object.keys(REHEARSAL_TYPE_LABEL) as RehearsalType[];
const STATUSES = Object.keys(REHEARSAL_STATUS_LABEL) as RehearsalStatus[];

export interface RehearsalFormDefaults {
  title?: string;
  type?: RehearsalType;
  startsAt?: string;
  endsAt?: string;
  venueOrMeetingUrl?: string | null;
  agenda?: string | null;
  status?: RehearsalStatus;
  notes?: string | null;
}

export function RehearsalForm({
  mode,
  eventId,
  rehearsalId,
  defaults,
}: {
  mode: "create" | "edit";
  eventId?: string;
  rehearsalId?: string;
  defaults?: RehearsalFormDefaults;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createRehearsalAction : updateRehearsalAction,
    { ok: false },
  );
  const d = defaults ?? {};

  return (
    <Card title={mode === "create" ? "Jadwalkan rehearsal" : "Ubah rehearsal"}>
      <form action={formAction} className="flex flex-col gap-4">
        {mode === "create" ? (
          <input type="hidden" name="eventId" value={eventId} />
        ) : (
          <input type="hidden" name="rehearsalId" value={rehearsalId} />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="rh-title" className="text-sm font-medium">
              Judul
            </label>
            <input
              id="rh-title"
              name="title"
              required
              minLength={3}
              maxLength={150}
              placeholder="cth. Monitoring online Batch 1"
              defaultValue={d.title ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rh-type" className="text-sm font-medium">
              Tipe
            </label>
            <select id="rh-type" name="type" defaultValue={d.type ?? "ONLINE_MONITORING"} className={inputClass}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {REHEARSAL_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="rh-start" className="text-sm font-medium">
              Mulai
            </label>
            <input
              id="rh-start"
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={d.startsAt ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rh-end" className="text-sm font-medium">
              Selesai (opsional)
            </label>
            <input
              id="rh-end"
              name="endsAt"
              type="datetime-local"
              defaultValue={d.endsAt ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rh-status" className="text-sm font-medium">
              Status
            </label>
            <select id="rh-status" name="status" defaultValue={d.status ?? "SCHEDULED"} className={inputClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REHEARSAL_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rh-venue" className="text-sm font-medium">
            Lokasi / link meeting
          </label>
          <input
            id="rh-venue"
            name="venueOrMeetingUrl"
            maxLength={500}
            defaultValue={d.venueOrMeetingUrl ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rh-agenda" className="text-sm font-medium">
            Agenda
          </label>
          <textarea
            id="rh-agenda"
            name="agenda"
            rows={3}
            maxLength={191}
            defaultValue={d.agenda ?? ""}
            placeholder="cth. Cek form, key, tempo, part guide Batch 1"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rh-notes" className="text-sm font-medium">
            Catatan
          </label>
          <textarea
            id="rh-notes"
            name="notes"
            rows={2}
            maxLength={5000}
            defaultValue={d.notes ?? ""}
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
            {pending ? "Menyimpan…" : mode === "create" ? "Jadwalkan" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

