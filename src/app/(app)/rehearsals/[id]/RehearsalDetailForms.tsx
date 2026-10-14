"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AttendanceStatus } from "@/generated/prisma/client";
import { ATTENDANCE_STATUS_LABEL } from "@/lib/rehearsal-labels";
import {
  setRehearsalSongsAction,
  upsertAttendanceAction,
} from "@server/actions/operations";

const STATUSES = Object.keys(ATTENDANCE_STATUS_LABEL) as AttendanceStatus[];

export function SongChecklistForm({
  rehearsalId,
  songs,
  selected,
}: {
  rehearsalId: string;
  songs: { id: string; title: string }[];
  selected: string[];
}) {
  const [state, formAction, pending] = useActionState(setRehearsalSongsAction, {
    ok: false,
  });
  const selectedSet = new Set(selected);
  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="rehearsalId" value={rehearsalId} />
        {songs.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada lagu di event ini.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {songs.map((s) => (
              <li key={s.id}>
                <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm dark:border-zinc-800">
                  <input
                    type="checkbox"
                    name="songIds"
                    value={s.id}
                    defaultChecked={selectedSet.has(s.id)}
                    className="h-5 w-5"
                  />
                  {s.title}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "…" : "Simpan lagu rehearsal"}
          </Button>
        </div>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Daftar lagu disimpan.</Alert> : null}
    </div>
  );
}

export function AttendanceRowForm({
  rehearsalId,
  personId,
  personName,
  current,
  currentNote,
}: {
  rehearsalId: string;
  personId: string;
  personName: string;
  current?: AttendanceStatus;
  currentNote?: string | null;
}) {
  const [state, formAction, pending] = useActionState(upsertAttendanceAction, {
    ok: false,
  });
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
    >
      <input type="hidden" name="rehearsalId" value={rehearsalId} />
      <input type="hidden" name="personId" value={personId} />
      <span className="min-w-32 flex-1 font-medium">{personName}</span>
      <select
        name="status"
        aria-label={`Kehadiran ${personName}`}
        defaultValue={current ?? "EXPECTED"}
        className="h-10 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {ATTENDANCE_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <input
        name="note"
        aria-label={`Catatan kehadiran ${personName}`}
        placeholder="Catatan"
        maxLength={500}
        defaultValue={currentNote ?? ""}
        className="h-10 min-w-32 flex-1 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : "Simpan"}
      </Button>
      {!state.ok && state.error ? (
        <span className="w-full text-red-700 dark:text-red-400">{state.error}</span>
      ) : null}
    </form>
  );
}

export function AttendanceCard({ children }: { children: React.ReactNode }) {
  return <Card title="Kehadiran">{children}</Card>;
}
