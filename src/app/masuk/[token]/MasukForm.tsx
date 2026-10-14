"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { redeemInviteAction } from "@server/actions/invites";

export function MasukForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(redeemInviteAction, {
    ok: false,
  });
  return (
    <div className="flex flex-col gap-4">
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <Button type="submit" disabled={pending}>
          {pending ? "Membuka…" : "Masuk portal"}
        </Button>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Link sekali pakai · berlaku 7 hari · minta yang baru ke admin bila
        kedaluwarsa.
      </p>
    </div>
  );
}
