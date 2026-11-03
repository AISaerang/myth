"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { addSongFromLibraryAction } from "@server/actions/songs";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function SongLibraryPicker({
  eventId,
  songs,
}: {
  eventId: string;
  songs: { id: string; title: string; artistOrAuthor: string | null; key: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(addSongFromLibraryAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-2">
      {songs.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Semua lagu pustaka sudah ada di setlist event ini.
        </p>
      ) : (
        <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="eventId" value={eventId} />
          <select
            name="songId"
            aria-label="Pilih lagu pustaka"
            required
            defaultValue=""
            className={`${inputClass} min-w-0 flex-1`}
          >
            <option value="" disabled>
              Pilih lagu dari pustaka…
            </option>
            {songs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
                {song.artistOrAuthor ? ` — ${song.artistOrAuthor}` : ""}
                {song.key ? ` · Asli ${song.key}` : ""}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Menambahkan…" : "Tambah ke setlist"}
          </Button>
        </form>
      )}
      {!state.ok && state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Lagu ditambahkan sebagai draft event.</Alert> : null}
    </div>
  );
}
