"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PasswordField } from "@/components/ui/PasswordField";
import { PASSWORD_MAX_LENGTH } from "@/lib/password-policy";
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
        <PasswordField
          id="currentPassword"
          name="currentPassword"
          label="Password saat ini"
          autoComplete="current-password"
          required
        />
        <PasswordField
          id="newPassword"
          name="newPassword"
          label="Password baru"
          autoComplete="new-password"
          required
          minLength={1}
          maxLength={PASSWORD_MAX_LENGTH}
          helper="Wajib diisi. Minimal 1 karakter, maksimal 256."
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Konfirmasi password baru"
          autoComplete="new-password"
          required
          minLength={1}
          maxLength={PASSWORD_MAX_LENGTH}
        />
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
