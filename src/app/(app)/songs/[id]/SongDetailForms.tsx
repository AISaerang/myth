"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  activateVersionAction,
  addMaterialAction,
  assignPersonAction,
  createVersionAction,
  deleteMaterialAction,
  lockFinalAction,
  setMaterialActiveAction,
  setSongPublishedAction,
  unassignPersonAction,
  unlockFinalAction,
} from "@server/actions/songs";
import { MATERIAL_CATEGORY_LABEL } from "../material-labels";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function Result({ state }: { state: { ok: boolean; error?: string } }) {
  if (state.ok) return <Alert tone="info">Tersimpan.</Alert>;
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  return null;
}

export function PublishToggle({
  songId,
  isPublished,
  isLocked,
}: {
  songId: string;
  isPublished: boolean;
  isLocked: boolean;
}) {
  const [state, formAction, pending] = useActionState(setSongPublishedAction, {
    ok: false,
  });
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="songId" value={songId} />
        <input type="hidden" name="isPublished" value={String(!isPublished)} />
        <Button type="submit" variant="secondary" size="sm" disabled={pending || isLocked}>
          {isPublished ? "Tarik publikasi" : "Publikasikan"}
        </Button>
      </form>
      <Result state={state} />
    </div>
  );
}

export function AssignForm({
  songId,
  people,
  skills,
}: {
  songId: string;
  people: { id: string; displayName: string }[];
  skills: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignPersonAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <div className="flex flex-col gap-2">
      <form ref={formRef} action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="songId" value={songId} />
        <select name="personId" aria-label="Personel" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Pilih personel…
          </option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
        <select name="instrumentSkillId" aria-label="Skill" defaultValue="" className={inputClass}>
          <option value="">Tanpa skill khusus</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          name="assignmentNote"
          aria-label="Catatan assignment"
          placeholder="Catatan (opsional)"
          maxLength={500}
          className={`${inputClass} min-w-40 flex-1`}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Tugaskan"}
        </Button>
      </form>
      <Result state={state} />
    </div>
  );
}

export function UnassignButton({
  songId,
  personId,
  name,
}: {
  songId: string;
  personId: string;
  name: string;
}) {
  const [, formAction, pending] = useActionState(unassignPersonAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="personId" value={personId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Lepas ${name}`}
        className="rounded px-1 text-xs text-zinc-500 underline hover:text-red-600"
      >
        lepas
      </button>
    </form>
  );
}

export function VersionForm({ songId }: { songId: string }) {
  const [state, formAction, pending] = useActionState(createVersionAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <div className="flex flex-col gap-2">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input type="hidden" name="songId" value={songId} />
        <input
          name="versionLabel"
          aria-label="Label versi"
          placeholder="cth. v01"
          required
          maxLength={20}
          className={inputClass}
        />
        <input
          name="referenceUrl"
          aria-label="URL referensi"
          placeholder="URL referensi (opsional)"
          type="url"
          className={inputClass}
        />
        <textarea
          name="changeSummary"
          aria-label="Ringkasan perubahan"
          placeholder="Ringkasan perubahan"
          required
          rows={2}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input name="key" aria-label="Key versi" placeholder="Key (opsional)" maxLength={8} className={inputClass} />
        <input
          name="bpm"
          aria-label="BPM versi"
          placeholder="BPM (opsional)"
          type="number"
          min={30}
          max={300}
          className={inputClass}
        />
        <textarea
          name="grooveNotes"
          aria-label="Catatan groove"
          placeholder="Groove/feel (opsional)"
          rows={2}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <textarea
          name="structureNotes"
          aria-label="Catatan struktur"
          placeholder="Struktur/intro/ending/cue (opsional)"
          rows={2}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "…" : "Buat versi"}
          </Button>
        </div>
      </form>
      <Result state={state} />
    </div>
  );
}

export function VersionActions({
  songId,
  versionId,
  isActive,
  isLocked,
}: {
  songId: string;
  versionId: string;
  isActive: boolean;
  isLocked: boolean;
}) {
  const [actState, actAction, actPending] = useActionState(activateVersionAction, {
    ok: false,
  });
  const [lockState, lockAction, lockPending] = useActionState(lockFinalAction, {
    ok: false,
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isActive && !isLocked ? (
        <form action={actAction}>
          <input type="hidden" name="versionId" value={versionId} />
          <input type="hidden" name="songId" value={songId} />
          <Button type="submit" variant="secondary" size="sm" disabled={actPending}>
            Aktifkan
          </Button>
        </form>
      ) : null}
      {!isLocked ? (
        <form action={lockAction}>
          <input type="hidden" name="versionId" value={versionId} />
          <input type="hidden" name="songId" value={songId} />
          <Button type="submit" variant="secondary" size="sm" disabled={lockPending}>
            Kunci final
          </Button>
        </form>
      ) : null}
      {!actState.ok && actState.error ? <Alert tone="danger">{actState.error}</Alert> : null}
      {!lockState.ok && lockState.error ? <Alert tone="danger">{lockState.error}</Alert> : null}
    </div>
  );
}

export function UnlockButton({ songId }: { songId: string }) {
  const [state, formAction, pending] = useActionState(unlockFinalAction, {
    ok: false,
  });
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input type="hidden" name="songId" value={songId} />
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          Buka kunci final
        </Button>
      </form>
      <Result state={state} />
    </div>
  );
}

const CATEGORIES = Object.entries(MATERIAL_CATEGORY_LABEL);

export function MaterialForm({
  songId,
  versions,
}: {
  songId: string;
  versions: { id: string; versionLabel: string }[];
}) {
  const [state, formAction, pending] = useActionState(addMaterialAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <div className="flex flex-col gap-2">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input type="hidden" name="songId" value={songId} />
        <input
          name="title"
          aria-label="Judul materi"
          placeholder="Judul materi"
          required
          minLength={2}
          maxLength={150}
          className={inputClass}
        />
        <select name="category" aria-label="Kategori" className={inputClass} defaultValue="ORIGINAL">
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="url"
          aria-label="URL materi"
          placeholder="https://…"
          type="url"
          required
          className={`${inputClass} sm:col-span-2`}
        />
        <input
          name="versionLabel"
          aria-label="Label versi materi"
          placeholder="Label versi (opsional)"
          maxLength={20}
          className={inputClass}
        />
        <select name="arrangementVersionId" aria-label="Tautkan versi" defaultValue="" className={inputClass}>
          <option value="">Tanpa tautan versi</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.versionLabel}
            </option>
          ))}
        </select>
        <input
          name="description"
          aria-label="Deskripsi materi"
          placeholder="Deskripsi (opsional)"
          maxLength={2000}
          className={`${inputClass} sm:col-span-2`}
        />
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "…" : "Tambah materi"}
          </Button>
        </div>
      </form>
      <Result state={state} />
    </div>
  );
}

export function MaterialActions({
  songId,
  materialId,
  isActive,
}: {
  songId: string;
  materialId: string;
  isActive: boolean;
}) {
  const [toggleState, toggleAction, togglePending] = useActionState(
    setMaterialActiveAction,
    { ok: false },
  );
  const [delState, delAction, delPending] = useActionState(deleteMaterialAction, {
    ok: false,
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={toggleAction}>
        <input type="hidden" name="materialId" value={materialId} />
        <input type="hidden" name="songId" value={songId} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <Button type="submit" variant="secondary" size="sm" disabled={togglePending}>
          {isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </form>
      <form action={delAction}>
        <input type="hidden" name="materialId" value={materialId} />
        <input type="hidden" name="songId" value={songId} />
        <Button type="submit" variant="danger" size="sm" disabled={delPending}>
          Hapus
        </Button>
      </form>
      {!toggleState.ok && toggleState.error ? (
        <Alert tone="danger">{toggleState.error}</Alert>
      ) : null}
      {!delState.ok && delState.error ? (
        <Alert tone="danger">{delState.error}</Alert>
      ) : null}
    </div>
  );
}
