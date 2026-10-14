"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  assignSkillAction,
  createSkillAction,
  deleteSkillAction,
  unassignSkillAction,
} from "@server/actions/personnel";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function SkillManager({
  skills,
  usage,
}: {
  skills: { id: string; name: string }[];
  usage: Record<string, number>;
}) {
  const [createState, createAction, createPending] = useActionState(
    createSkillAction,
    { ok: false },
  );
  const [deleteState, deleteAction] = useActionState(deleteSkillAction, {
    ok: false,
  });

  return (
    <Card title="Skill / instrumen">
      <form action={createAction} className="mb-3 flex gap-2">
        <input
          name="name"
          aria-label="Nama skill baru"
          placeholder="cth. Keyboard, Bass, Vokal"
          required
          minLength={2}
          maxLength={50}
          className={`${inputClass} flex-1`}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={createPending}>
          {createPending ? "…" : "Tambah"}
        </Button>
      </form>
      {!createState.ok && createState.error ? (
        <Alert tone="danger">{createState.error}</Alert>
      ) : null}
      {!deleteState.ok && deleteState.error ? (
        <Alert tone="danger">{deleteState.error}</Alert>
      ) : null}
      {skills.length === 0 ? (
        <p className="text-sm text-zinc-500">Belum ada skill.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {skills.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span>
                {s.name}{" "}
                <span className="text-zinc-500">· {usage[s.id] ?? 0}</span>
              </span>
              <form action={deleteAction}>
                <input type="hidden" name="skillId" value={s.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Hapus
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function AssignSkillForm({
  personId,
  skills,
}: {
  personId: string;
  skills: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignSkillAction, {
    ok: false,
  });
  if (skills.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="personId" value={personId} />
        <select
          name="instrumentSkillId"
          aria-label="Pilih skill"
          className={inputClass}
          defaultValue=""
          required
        >
          <option value="" disabled>
            Pilih skill…
          </option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          name="proficiencyNote"
          aria-label="Catatan kemampuan (opsional)"
          placeholder="Catatan (opsional)"
          maxLength={200}
          className={`${inputClass} flex-1`}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Tambah skill"}
        </Button>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </div>
  );
}

export function UnassignSkillButton({
  personId,
  instrumentSkillId,
  name,
}: {
  personId: string;
  instrumentSkillId: string;
  name: string;
}) {
  const [, formAction, pending] = useActionState(unassignSkillAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="instrumentSkillId" value={instrumentSkillId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Lepas skill ${name}`}
        className="rounded px-1 text-xs text-zinc-500 underline hover:text-red-600"
      >
        lepas
      </button>
    </form>
  );
}
