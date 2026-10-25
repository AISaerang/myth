"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createUserAction } from "@server/actions/admin-users";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card title="Tambah personel">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="displayName" className="text-sm font-medium">
              Nama tampilan
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="off"
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={32}
              autoComplete="off"
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:max-w-xs">
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="USER"
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="USER">USER — personel</option>
            <option value="OBSERVER">OBSERVER — Pantau (baca saja)</option>
            <option value="ADMIN">ADMIN — pengelola/MD</option>
          </select>
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        {state.ok && state.temporaryPassword ? (
          <Alert tone="warning" title="Password sementara — hanya tampil sekali">
            <p>
              Akun <strong>{state.username}</strong> dibuat. Kirim password
              ini lewat kanal privat (bukan grup chat):
            </p>
            <p className="mt-2 select-all rounded bg-white/60 px-2 py-1 font-mono text-sm font-semibold dark:bg-black/40">
              {state.temporaryPassword}
            </p>
            <p className="mt-2">
              User wajib menggantinya saat login pertama.
            </p>
          </Alert>
        ) : null}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Membuat…" : "Buat akun"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
