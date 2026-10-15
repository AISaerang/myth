"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { BatchStatus } from "@/generated/prisma/client";
import { BATCH_STATUS_LABEL, canTransitionBatch } from "@/lib/batch-status";
import {
  addSongToBatchAction,
  assignBatchAction,
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

interface AssignRow {
  key: number;
  personId: string;
  skillId: string;
}

// Assign sebatch: several personnel (each with own part) to checked
// songs of this batch in one submit. Existing pairs are skipped.
export function AssignBatchForm({
  batchId,
  people,
  skills,
  songs,
}: {
  batchId: string;
  people: { id: string; displayName: string; skills: string[] }[];
  skills: { id: string; name: string }[];
  songs: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignBatchAction, {
    ok: false,
  });
  const [rows, setRows] = useState<AssignRow[]>([
    { key: 0, personId: "", skillId: "" },
  ]);
  const [checked, setChecked] = useState<string[]>(songs.map((s) => s.id));
  const [nextKey, setNextKey] = useState(1);

  if (songs.length === 0) return null;
  const chosen = new Set(rows.map((r) => r.personId).filter(Boolean));
  const skillByName = new Map(skills.map((s) => [s.name, s.id]));

  function updateRow(key: number, patch: Partial<AssignRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function pickPerson(key: number, personId: string) {
    const person = people.find((p) => p.id === personId);
    const autoSkill =
      person && person.skills.length > 0
        ? (skillByName.get(person.skills[0]) ?? "")
        : "";
    updateRow(key, { personId, skillId: autoSkill });
  }

  function toggleSong(songId: string) {
    setChecked((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId],
    );
  }

  const payload = JSON.stringify({
    rows: rows
      .filter((r) => r.personId)
      .map((r) => ({
        personId: r.personId,
        ...(r.skillId ? { instrumentSkillId: r.skillId } : {}),
      })),
    songIds: checked,
  });

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="batchId" value={batchId} />
        <input type="hidden" name="payload" value={payload} />
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Pilih personel"
              value={row.personId}
              onChange={(e) => pickPerson(row.key, e.target.value)}
              className={inputClass}
            >
              <option value="">Pilih personel…</option>
              {people.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  disabled={p.id !== row.personId && chosen.has(p.id)}
                >
                  {p.displayName}
                </option>
              ))}
            </select>
            <select
              aria-label="Pilih part"
              value={row.skillId}
              onChange={(e) => updateRow(row.key, { skillId: e.target.value })}
              className={inputClass}
            >
              <option value="">Tanpa part khusus</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setRows((prev) => prev.filter((r) => r.key !== row.key))
                }
              >
                Hapus
              </Button>
            ) : null}
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setRows((prev) => [...prev, { key: nextKey, personId: "", skillId: "" }]);
              setNextKey((k) => k + 1);
            }}
          >
            + Tambah personel
          </Button>
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">
            Terapkan ke lagu ({checked.length}/{songs.length})
          </legend>
          <div className="flex flex-col gap-1">
            {songs.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked.includes(s.id)}
                  onChange={() => toggleSong(s.id)}
                  className="h-4 w-4"
                />
                {s.title}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Menerapkan…" : "Terapkan sebatch"}
          </Button>
        </div>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok && state.summary ? (
        <Alert tone="info" title="Assign sebatch selesai">
          <ul className="flex flex-col gap-1">
            {state.summary.map((r) => (
              <li key={r.personId}>
                {r.displayName}: {r.created} ditugaskan
                {r.skipped > 0 ? `, ${r.skipped} dilewati (sudah ada)` : ""}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}
