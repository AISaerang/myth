"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EquipmentStatus } from "@/generated/prisma/client";
import { EQUIPMENT_STATUS_LABEL } from "@/lib/rehearsal-labels";
import {
  createEquipmentAction,
  updateEquipmentAction,
} from "@server/actions/operations";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const STATUSES = Object.keys(EQUIPMENT_STATUS_LABEL) as EquipmentStatus[];

export interface EquipmentFormDefaults {
  name?: string;
  category?: string;
  quantity?: number;
  status?: EquipmentStatus;
  ownerOrSource?: string | null;
  assigneePersonId?: string | null;
  dueAt?: string;
  notes?: string | null;
}

function EquipmentFields({
  people,
  defaults,
}: {
  people: { id: string; displayName: string }[];
  defaults?: EquipmentFormDefaults;
}) {
  const d = defaults ?? {};
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-name" className="text-sm font-medium">
            Item
          </label>
          <input
            id="eq-name"
            name="name"
            required
            minLength={2}
            maxLength={150}
            placeholder="cth. Kabel XLR cadangan"
            defaultValue={d.name ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-cat" className="text-sm font-medium">
            Kategori
          </label>
          <input
            id="eq-cat"
            name="category"
            required
            minLength={2}
            maxLength={100}
            placeholder="cth. Kabel, Monitor, Power"
            defaultValue={d.category ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-qty" className="text-sm font-medium">
            Jumlah
          </label>
          <input
            id="eq-qty"
            name="quantity"
            type="number"
            min={1}
            max={999}
            defaultValue={d.quantity ?? 1}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="eq-status"
            name="status"
            defaultValue={d.status ?? "NOT_CHECKED"}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {EQUIPMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-pic" className="text-sm font-medium">
            PIC (wajib bila Blocked)
          </label>
          <select
            id="eq-pic"
            name="assigneePersonId"
            defaultValue={d.assigneePersonId ?? ""}
            className={inputClass}
          >
            <option value="">Tanpa PIC</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-due" className="text-sm font-medium">
            Tenggat (opsional)
          </label>
          <input
            id="eq-due"
            name="dueAt"
            type="datetime-local"
            defaultValue={d.dueAt ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-owner" className="text-sm font-medium">
            Pemilik/sumber
          </label>
          <input
            id="eq-owner"
            name="ownerOrSource"
            maxLength={200}
            placeholder="cth. Gereja A / sewa"
            defaultValue={d.ownerOrSource ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="eq-notes" className="text-sm font-medium">
            Catatan
          </label>
          <input
            id="eq-notes"
            name="notes"
            maxLength={2000}
            defaultValue={d.notes ?? ""}
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}

export function CreateEquipmentForm({
  eventId,
  people,
}: {
  eventId: string;
  people: { id: string; displayName: string }[];
}) {
  const [state, formAction, pending] = useActionState(createEquipmentAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <Card title="Tambah item teknis">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <EquipmentFields people={people} />
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        {state.ok ? <Alert tone="info">Item ditambahkan.</Alert> : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Menambah…" : "Tambah item"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function EditEquipmentForm({
  itemId,
  people,
  defaults,
}: {
  itemId: string;
  people: { id: string; displayName: string }[];
  defaults: EquipmentFormDefaults & { dueAtIso?: string };
}) {
  const [state, formAction, pending] = useActionState(updateEquipmentAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="itemId" value={itemId} />
      <EquipmentFields
        people={people}
        defaults={{ ...defaults, dueAt: defaults.dueAtIso }}
      />
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Perubahan disimpan.</Alert> : null}
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
