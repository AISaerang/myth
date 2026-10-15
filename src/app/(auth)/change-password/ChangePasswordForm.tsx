"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { changePasswordAction } from "@server/actions/auth";

export function ChangePasswordForm({ isFirstLogin }: { isFirstLogin: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, {
    ok: false,
  });

  return (
    <Card title={isFirstLogin ? "Buat password baru" : "Ganti password"}>
      {isFirstLogin ? (
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Ini login pertamamu. Ganti password sementara dengan password
          pribadimu.
        </p>
      ) : null}
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="currentPassword" className="text-sm font-medium">
            Password saat ini
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newPassword" className="text-sm font-medium">
            Password baru
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={1}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Konfirmasi password baru
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan password"}
        </Button>
      </form>
    </Card>
  );
}
