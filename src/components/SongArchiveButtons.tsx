"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { archiveSongAction, restoreSongAction } from "@server/actions/songs";

export function ArchiveSongButton({
  songId,
  eventId,
}: {
  songId: string;
  eventId: string;
}) {
  const [state, formAction, pending] = useActionState(archiveSongAction, {
    ok: false,
  });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Arsipkan lagu ini? Lagu diarsipkan tidak akan muncul di daftar default atau pemilihan lagu event.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "…" : "Arsipkan lagu"}
      </Button>
      {!state.ok && state.error ? (
        <span className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function RestoreSongButton({
  songId,
  eventId,
}: {
  songId: string;
  eventId: string;
}) {
  const [state, formAction, pending] = useActionState(restoreSongAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : "Pulihkan lagu"}
      </Button>
      {!state.ok && state.error ? (
        <span className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
