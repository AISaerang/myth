"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { bulkAssignSongsAction } from "@server/actions/songs";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

type Target = "EVENT" | "BATCH" | "SONGS";

export function BulkAssignPanel({
  eventId,
  people,
  batches,
  songs,
}: {
  eventId: string;
  people: { id: string; displayName: string; skills: string[] }[];
  batches: { id: string; name: string; songs: { id: string; title: string; badge: number }[] }[];
  songs: { id: string; title: string; badgeLabel: string }[];
}) {
  const [state, formAction, pending] = useActionState(bulkAssignSongsAction, {
    ok: false,
  });
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [target, setTarget] = useState<Target>("EVENT");
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [songIds, setSongIds] = useState<string[]>([]);

  const allPeople = people.length > 0 && personIds.length === people.length;
  const batch = batches.find((item) => item.id === batchId) ?? null;
  const payload = useMemo(
    () =>
      JSON.stringify({
        personIds,
        target,
        ...(target === "BATCH" && batchId ? { batchId } : {}),
        ...(target === "SONGS" ? { songIds } : {}),
      }),
    [personIds, target, batchId, songIds],
  );

  function togglePerson(id: string) {
    setPersonIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSong(id: string) {
    setSongIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  if (people.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Belum ada pemusik atau penyanyi yang menjadi anggota event ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pilih personel, lalu terapkan ke semua lagu event, satu batch, atau lagu tertentu.
        Penugasan yang sudah ada dilewati.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="payload" value={payload} />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">
            Pemusik / penyanyi ({personIds.length}/{people.length})
          </legend>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allPeople}
              onChange={() =>
                setPersonIds(allPeople ? [] : people.map((person) => person.id))
              }
            />
            Pilih semua
          </label>
          <div className="flex max-h-64 flex-col gap-1 overflow-auto">
            {people.map((person) => (
              <label key={person.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={personIds.includes(person.id)}
                  onChange={() => togglePerson(person.id)}
                />
                <span>
                  {person.displayName}
                  {person.skills.length > 0 ? (
                    <span className="text-zinc-500"> · {person.skills.join(", ")}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Target lagu</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="target-choice"
              checked={target === "EVENT"}
              onChange={() => setTarget("EVENT")}
            />
            Semua lagu event ini
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="target-choice"
              checked={target === "BATCH"}
              onChange={() => setTarget("BATCH")}
            />
            Satu batch
          </label>
          {target === "BATCH" ? (
            <select
              aria-label="Pilih batch"
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              className={inputClass}
            >
              {batches.length === 0 ? <option value="">Belum ada batch</option> : null}
              {batches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.songs.length} lagu)
                </option>
              ))}
            </select>
          ) : null}
          {target === "BATCH" && batch ? (
            <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              {batch.songs.map((song) => (
                <li key={song.id}>
                  Badge {song.badge} · {song.title}
                </li>
              ))}
            </ul>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="target-choice"
              checked={target === "SONGS"}
              onChange={() => setTarget("SONGS")}
            />
            Lagu tertentu
          </label>
          {target === "SONGS" ? (
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={songs.length > 0 && songIds.length === songs.length}
                  onChange={() =>
                    setSongIds(
                      songIds.length === songs.length ? [] : songs.map((song) => song.id),
                    )
                  }
                />
                Pilih semua lagu
              </label>
              {songs.map((song) => (
                <label key={song.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={songIds.includes(song.id)}
                    onChange={() => toggleSong(song.id)}
                  />
                  {song.badgeLabel ? `${song.badgeLabel} · ` : ""}
                  {song.title}
                </label>
              ))}
            </div>
          ) : null}
        </fieldset>
        <div>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Menugaskan…" : "Tugaskan sekaligus"}
          </Button>
        </div>
      </form>
      {!state.ok && state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? (
        <Alert tone="info" title="Penugasan sekaligus selesai">
          <p>
            {state.created ?? 0} dibuat, {state.skipped ?? 0} dilewati (sudah ada).
          </p>
          {state.errors && state.errors.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {state.errors.slice(0, 8).map((error, index) => (
                <li key={`${index}-${error}`}>{error}</li>
              ))}
              {state.errors.length > 8 ? (
                <li>{state.errors.length - 8} pesan lain tidak ditampilkan.</li>
              ) : null}
            </ul>
          ) : null}
        </Alert>
      ) : null}
    </div>
  );
}
