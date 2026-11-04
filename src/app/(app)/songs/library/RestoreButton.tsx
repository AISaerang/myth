"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { restoreSongAction } from "@server/actions/songs";

export function RestoreButton({
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
        {pending ? "…" : "Pulihkan"}
      </Button>
      {!state.ok && state.error ? (
        <span className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
