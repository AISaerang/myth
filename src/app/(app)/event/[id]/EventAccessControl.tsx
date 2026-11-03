"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { setEventAccessClosedAction } from "@server/actions/event";

export function EventAccessControl({
  eventId,
  accessClosedAt,
}: {
  eventId: string;
  accessClosedAt: Date | null;
}) {
  const [state, formAction, pending] = useActionState(
    setEventAccessClosedAction,
    { ok: false },
  );
  const closed = Boolean(accessClosedAt);
  return (
    <div className="flex flex-col gap-2">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Status akses diperbarui.</Alert> : null}
      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              closed
                ? "Buka kembali akses member/pantau ke event ini?"
                : "Tutup akses event ini? Member dan pantau tidak bisa mengakses sampai dibuka kembali.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="intent" value={closed ? "reopen" : "close"} />
        <Button
          type="submit"
          variant={closed ? "secondary" : "danger"}
          disabled={pending}
        >
          {pending
            ? "Menyimpan…"
            : closed
              ? "Buka kembali akses"
              : "Tutup akses"}
        </Button>
      </form>
    </div>
  );
}
