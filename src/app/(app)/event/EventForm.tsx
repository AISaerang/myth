"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EventStatus } from "@/generated/prisma/client";
import {
  createEventAction,
  updateEventAction,
} from "@server/actions/event";

export interface EventFormDefaults {
  name?: string;
  description?: string | null;
  eventDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  venue?: string | null;
  theme?: string | null;
  targetDurationMinutes?: number | null;
  eventStatus?: EventStatus;
  liturgicalFlowUrl?: string | null;
  committeePicName?: string | null;
  committeePicContact?: string | null;
  notes?: string | null;
}

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function TextField({
  id,
  label,
  defaultValue,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name"> & {
  id: string;
  label: string;
  defaultValue?: string | number | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} name={id} defaultValue={defaultValue ?? ""} className={inputClass} {...props} />
    </div>
  );
}

export function EventForm({
  mode,
  eventId,
  defaults,
}: {
  mode: "create" | "edit";
  eventId?: string;
  defaults?: EventFormDefaults;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createEventAction : updateEventAction,
    { ok: false },
  );
  const d = defaults ?? {};

  return (
    <Card title={mode === "create" ? "Buat event" : "Ubah event brief"}>
      <form action={formAction} className="flex flex-col gap-4">
        {mode === "edit" ? (
          <input type="hidden" name="eventId" value={eventId} />
        ) : null}
        <TextField
          id="name"
          label="Nama acara"
          defaultValue={d.name}
          required
          minLength={3}
          maxLength={120}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            id="eventDate"
            label="Tanggal"
            type="date"
            defaultValue={d.eventDate}
          />
          <TextField
            id="startTime"
            label="Jam mulai"
            type="time"
            defaultValue={d.startTime ?? ""}
          />
          <TextField
            id="endTime"
            label="Jam selesai"
            type="time"
            defaultValue={d.endTime ?? ""}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField id="venue" label="Lokasi" defaultValue={d.venue} maxLength={200} />
          <TextField id="theme" label="Tema" defaultValue={d.theme} maxLength={200} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="targetDurationMinutes"
            label="Target durasi (menit)"
            type="number"
            min={1}
            max={1440}
            defaultValue={d.targetDurationMinutes ?? ""}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="eventStatus" className="text-sm font-medium">
              Status konfirmasi
            </label>
            <select
              id="eventStatus"
              name="eventStatus"
              defaultValue={d.eventStatus ?? "DRAFT"}
              className={inputClass}
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING_CONFIRMATION">Menunggu konfirmasi</option>
              <option value="CONFIRMED">Terkonfirmasi</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
        </div>
        <TextField
          id="liturgicalFlowUrl"
          label="Link liturgi/rundown"
          type="url"
          placeholder="https://…"
          defaultValue={d.liturgicalFlowUrl}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="committeePicName"
            label="Nama PIC panitia"
            defaultValue={d.committeePicName}
            maxLength={100}
          />
          <TextField
            id="committeePicContact"
            label="Kontak PIC (khusus admin)"
            defaultValue={d.committeePicContact}
            maxLength={200}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Catatan
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={d.notes ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            Deskripsi
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={d.description ?? ""}
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
            {pending ? "Menyimpan…" : mode === "create" ? "Buat event" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
