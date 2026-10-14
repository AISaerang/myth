"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  createPersonAction,
  setPersonActiveAction,
  updatePersonAction,
} from "@server/actions/personnel";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function CreatePersonForm() {
  const [state, formAction, pending] = useActionState(createPersonAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card title="Tambah personel (tanpa akun)">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="displayName" className="text-sm font-medium">
              Nama tampilan
            </label>
            <input
              id="displayName"
              name="displayName"
              required
              minLength={2}
              maxLength={100}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="congregation" className="text-sm font-medium">
              Asal jemaat (opsional)
            </label>
            <input
              id="congregation"
              name="congregation"
              maxLength={100}
              autoComplete="off"
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="contact" className="text-sm font-medium">
              Kontak (khusus admin)
            </label>
            <input
              id="contact"
              name="contact"
              maxLength={200}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Catatan (opsional)
            </label>
            <input
              id="notes"
              name="notes"
              maxLength={1000}
              autoComplete="off"
              className={inputClass}
            />
          </div>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isConfirmed"
            className="h-5 w-5"
          />
          Sudah dikonfirmasi panitia/lintas jemaat
        </label>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        {state.ok ? <Alert tone="info">Personel ditambahkan.</Alert> : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Menambah…" : "Tambah personel"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function EditPersonForm({
  personId,
  displayName,
  congregation,
  contact,
  notes,
  isConfirmed,
}: {
  personId: string;
  displayName: string;
  congregation: string | null;
  contact: string | null;
  notes: string | null;
  isConfirmed: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePersonAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="personId" value={personId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          name="displayName"
          aria-label="Nama tampilan"
          defaultValue={displayName}
          required
          minLength={2}
          maxLength={100}
          className={inputClass}
        />
        <input
          name="congregation"
          aria-label="Asal jemaat"
          placeholder="Asal jemaat"
          defaultValue={congregation ?? ""}
          maxLength={100}
          className={inputClass}
        />
        <input
          name="contact"
          aria-label="Kontak (khusus admin)"
          placeholder="Kontak (khusus admin)"
          defaultValue={contact ?? ""}
          maxLength={200}
          autoComplete="off"
          className={inputClass}
        />
        <input
          name="notes"
          aria-label="Catatan"
          placeholder="Catatan"
          defaultValue={notes ?? ""}
          maxLength={1000}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isConfirmed"
            defaultChecked={isConfirmed}
            className="h-5 w-5"
          />
          Terkonfirmasi
        </label>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Simpan"}
        </Button>
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Perubahan disimpan.</Alert> : null}
    </form>
  );
}

export function PersonActiveToggle({
  personId,
  isActive,
}: {
  personId: string;
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(setPersonActiveAction, {
    ok: false,
  });
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <Button
          type="submit"
          variant={isActive ? "danger" : "secondary"}
          size="sm"
          disabled={pending}
        >
          {pending ? "…" : isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </div>
  );
}
