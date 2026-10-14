"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { SongStatus } from "@/generated/prisma/client";
import { SONG_STATUS_LABEL, SONG_STATUS_ORDER } from "@/lib/song-status";
import { createSongAction, updateSongAction } from "@server/actions/songs";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export interface SongFormDefaults {
  title?: string;
  artistOrAuthor?: string | null;
  liturgicalFunction?: string | null;
  key?: string | null;
  bpm?: number | null;
  timeSignature?: string | null;
  estimatedDurationSeconds?: number | null;
  originalReferenceUrl?: string | null;
  arrangementNotes?: string | null;
  status?: SongStatus;
}

export function SongForm({
  mode,
  eventId,
  songId,
  defaults,
}: {
  mode: "create" | "edit";
  eventId?: string;
  songId?: string;
  defaults?: SongFormDefaults;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createSongAction : updateSongAction,
    { ok: false },
  );
  const d = defaults ?? {};

  return (
    <Card title={mode === "create" ? "Tambah lagu" : "Ubah lagu"}>
      <form action={formAction} className="flex flex-col gap-4">
        {mode === "create" ? (
          <input type="hidden" name="eventId" value={eventId} />
        ) : (
          <input type="hidden" name="songId" value={songId} />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium">
              Judul
            </label>
            <input
              id="title"
              name="title"
              required
              minLength={2}
              maxLength={150}
              defaultValue={d.title ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="liturgicalFunction" className="text-sm font-medium">
              Fungsi liturgi
            </label>
            <input
              id="liturgicalFunction"
              name="liturgicalFunction"
              placeholder="cth. Pujian, Pengakuan dosa, Penutup"
              maxLength={150}
              defaultValue={d.liturgicalFunction ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="key" className="text-sm font-medium">
              Key
            </label>
            <input
              id="key"
              name="key"
              placeholder="cth. D"
              maxLength={8}
              defaultValue={d.key ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="bpm" className="text-sm font-medium">
              BPM
            </label>
            <input
              id="bpm"
              name="bpm"
              type="number"
              min={30}
              max={300}
              defaultValue={d.bpm ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="timeSignature" className="text-sm font-medium">
              Birama
            </label>
            <input
              id="timeSignature"
              name="timeSignature"
              placeholder="4/4"
              maxLength={8}
              defaultValue={d.timeSignature ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="estimatedDurationSeconds" className="text-sm font-medium">
              Durasi (detik)
            </label>
            <input
              id="estimatedDurationSeconds"
              name="estimatedDurationSeconds"
              type="number"
              min={1}
              max={3600}
              defaultValue={d.estimatedDurationSeconds ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="artistOrAuthor" className="text-sm font-medium">
              Artis/pencipta
            </label>
            <input
              id="artistOrAuthor"
              name="artistOrAuthor"
              maxLength={150}
              defaultValue={d.artistOrAuthor ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="originalReferenceUrl" className="text-sm font-medium">
              Referensi original (URL)
            </label>
            <input
              id="originalReferenceUrl"
              name="originalReferenceUrl"
              type="url"
              placeholder="https://…"
              defaultValue={d.originalReferenceUrl ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="arrangementNotes" className="text-sm font-medium">
            Catatan aransemen
          </label>
          <textarea
            id="arrangementNotes"
            name="arrangementNotes"
            rows={3}
            defaultValue={d.arrangementNotes ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex max-w-xs flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={d.status ?? "DRAFT"}
            className={inputClass}
          >
            {SONG_STATUS_ORDER.filter((s) => s !== "FINAL_LOCKED").map((s) => (
              <option key={s} value={s}>
                {SONG_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        {mode === "edit" && state.ok ? (
          <Alert tone="info">Perubahan disimpan.</Alert>
        ) : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : mode === "create" ? "Tambah lagu" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
