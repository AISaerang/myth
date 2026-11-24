"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { startGuestSessionAction } from "@server/actions/share-links";

export function GuestStartForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    startGuestSessionAction,
    { ok: false },
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1">
        <label htmlFor="guest-display-name" className="text-sm font-medium">
          Nama tampilan (opsional)
        </label>
        <input
          id="guest-display-name"
          name="displayName"
          type="text"
          maxLength={100}
          placeholder="cth. Sdr. Andreas"
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Membuka…" : "Lanjut sebagai Tamu"}
      </Button>
    </form>
  );
}
