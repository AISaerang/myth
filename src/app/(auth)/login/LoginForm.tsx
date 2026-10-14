"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { loginAction } from "@server/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {
    ok: false,
  });

  return (
    <Card title="Masuk">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>
    </Card>
  );
}
