import type { ReactNode } from "react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EventSwitcher } from "@/components/ui/EventSwitcher";
import { UiModeToggle } from "@/components/ui/UiModeToggle";
import { EventTypeBadge } from "@/components/ui/EventTypeBadge";
import { ACTIVE_EVENT_COOKIE } from "@/lib/event-context";
import { canManageEvent, isAdmin, isObserver, roleLabel, type SessionUser } from "@/lib/permissions";
import { UI_MODE_COOKIE, uiModeForEvent } from "@/lib/ui-mode";
import { requireFreshUser } from "@/lib/auth";
import type { Event } from "@/generated/prisma/client";
import { logoutAction } from "@server/actions/auth";
import { getEventRole, listAccessibleEvents } from "@server/services/event-access";

async function getUserAccessibleEvents(user: SessionUser): Promise<Event[]> {
  "use cache: private";
  cacheLife({ stale: 30 });
  return listAccessibleEvents(user);
}

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await connection();
  const user = await requireFreshUser();
  const admin = isAdmin(user);
  const observer = isObserver(user);
  const events = await getUserAccessibleEvents(user);
  const hasEventAccess = admin || events.length > 0;
  const cookieStore = await cookies();
  const selectedEventId = cookieStore.get(ACTIVE_EVENT_COOKIE)?.value;
  const currentEvent =
    events.find((event) => event.id === selectedEventId) ??
    events.find((event) => event.eventStatus !== "CANCELLED");
  const eventRole = currentEvent ? await getEventRole(user, currentEvent.id) : null;
  const canToggleView = Boolean(currentEvent) && (admin || canManageEvent(eventRole));
  const uiMode = currentEvent
    ? uiModeForEvent(cookieStore.get(UI_MODE_COOKIE)?.value, currentEvent.id)
    : "edit";
  const preview = canToggleView && uiMode === "preview";

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
          {hasEventAccess ? (
            <>
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
            </>
          ) : null}
          {hasEventAccess ? (
            <Link
              href="/songs"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {preview
                ? "Lagu Saya"
                : admin || canManageEvent(eventRole)
                  ? "Lagu"
                  : observer
                    ? "Lagu"
                    : "Lagu Saya"}
            </Link>
          ) : null}
          {hasEventAccess && (admin || observer) && !preview ? (
            <Link
              href="/batches"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Batch
            </Link>
          ) : null}
          {hasEventAccess ? (
            <Link
              href="/tasks"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {preview ? "Task Saya" : admin ? "Tasks" : observer ? "Tasks & Usulan" : "Task Saya"}
            </Link>
          ) : null}
          {hasEventAccess ? (
            <Link
              href="/rehearsals"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Rehearsal
            </Link>
          ) : null}
          {hasEventAccess ? (
            <Link
              href="/equipment"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Equipment
            </Link>
          ) : null}
          {hasEventAccess && admin && !preview ? (
            <Link
              href="/decisions"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Keputusan
            </Link>
          ) : null}
          {admin && !preview ? (
            <Link
              href="/people"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Personel &amp; Akses
            </Link>
          ) : null}
          {admin && !preview ? (
            <Link
              href="/broadcast"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Broadcast
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          {currentEvent ? (
            <>
              <EventTypeBadge type={currentEvent.eventType} />
              <EventSwitcher
                events={events.map(({ id, name, eventType }) => ({ id, name, eventType }))}
                selectedEventId={currentEvent.id}
              />
            </>
          ) : null}
          {currentEvent && canToggleView ? (
            <UiModeToggle eventId={currentEvent.id} mode={uiMode} />
          ) : null}
          {preview ? <Badge tone="warning">Pratinjau</Badge> : null}
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.displayName}
          </span>
          <Badge tone={admin ? "success" : "neutral"}>
            {roleLabel(user.role)}
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
