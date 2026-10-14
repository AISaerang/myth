"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  resetUserPasswordAction,
  setUserActiveAction,
  updateUserAction,
} from "@server/actions/admin-users";
import { createInviteAction } from "@server/actions/invites";

function HiddenUserId({ userId }: { userId: string }) {
  return <input type="hidden" name="userId" value={userId} />;
}

export function ResetPasswordForm({
  userId,
  username,
  disabled,
}: {
  userId: string;
  username: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resetUserPasswordAction,
    { ok: false },
  );
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <HiddenUserId userId={userId} />
        <Button type="submit" variant="secondary" size="sm" disabled={disabled || pending}>
          {pending ? "Mereset…" : "Reset password"}
        </Button>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok && state.temporaryPassword ? (
        <Alert tone="warning" title={`Password baru ${state.username ?? username} — sekali tampil`}>
          <p className="select-all rounded bg-white/60 px-2 py-1 font-mono text-sm font-semibold dark:bg-black/40">
            {state.temporaryPassword}
          </p>
        </Alert>
      ) : null}
    </div>
  );
}

export function InviteLinkForm({
  userId,
  username,
  disabled,
}: {
  userId: string;
  username: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createInviteAction, {
    ok: false,
  });
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <HiddenUserId userId={userId} />
        <Button type="submit" variant="secondary" size="sm" disabled={disabled || pending}>
          {pending ? "Membuat…" : "Buat link undangan"}
        </Button>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok && state.inviteLink ? (
        <Alert tone="warning" title={`Link undangan ${state.username ?? username} — sekali tampil`}>
          <p>
            Berlaku 7 hari, sekali pakai. Kirim lewat kanal privat (bukan
            grup chat):
          </p>
          <p className="mt-2 select-all break-all rounded bg-white/60 px-2 py-1 font-mono text-sm font-semibold dark:bg-black/40">
            {state.inviteLink}
          </p>
        </Alert>
      ) : null}
    </div>
  );
}

export function ActiveToggleForm({
  userId,
  isActive,
  disabled,
}: {
  userId: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(setUserActiveAction, {
    ok: false,
  });
  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <HiddenUserId userId={userId} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <Button
          type="submit"
          variant={isActive ? "danger" : "secondary"}
          size="sm"
          disabled={disabled || pending}
        >
          {pending ? "…" : isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </form>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </div>
  );
}

export function EditUserForm({
  userId,
  displayName,
  role,
  disabled,
}: {
  userId: string;
  displayName: string;
  role: "ADMIN" | "USER";
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateUserAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <HiddenUserId userId={userId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
        <input
          name="displayName"
          type="text"
          aria-label="Nama tampilan"
          defaultValue={displayName}
          required
          minLength={2}
          maxLength={100}
          disabled={disabled}
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="role"
          aria-label="Role"
          defaultValue={role}
          disabled={disabled}
          className="h-11 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <Button type="submit" variant="secondary" size="sm" disabled={disabled || pending}>
          {pending ? "…" : "Simpan"}
        </Button>
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? (
        <Alert tone="info">Perubahan disimpan.</Alert>
      ) : null}
    </form>
  );
}
