import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { isAdmin } from "@/lib/permissions";
import { requireFreshUser } from "@/lib/auth";
import { logoutAction } from "@server/actions/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireFreshUser();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <nav aria-label="Navigasi utama" className="flex flex-wrap gap-1">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <Link
            href="/event"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Event Brief
          </Link>
          <Link
            href="/team"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Tim
          </Link>
          <Link
            href="/songs"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {isAdmin(user) ? "Lagu" : "Lagu Saya"}
          </Link>
          {isAdmin(user) ? (
            <Link
              href="/batches"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Batch
            </Link>
          ) : null}
          <Link
            href="/tasks"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {isAdmin(user) ? "Tasks" : "Task Saya"}
          </Link>
          <Link
            href="/rehearsals"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Rehearsal
          </Link>
          <Link
            href="/equipment"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Equipment
          </Link>
          {isAdmin(user) ? (
            <Link
              href="/decisions"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Keputusan
            </Link>
          ) : null}
          {isAdmin(user) ? (
            <Link
              href="/people"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Personel &amp; Akses
            </Link>
          ) : null}
          {isAdmin(user) ? (
            <Link
              href="/broadcast"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Broadcast
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.displayName}
          </span>
          <Badge tone={user.role === "ADMIN" ? "success" : "neutral"}>
            {user.role}
          </Badge>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="sm">
              Keluar
            </Button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
