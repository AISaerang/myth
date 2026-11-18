import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AppNav } from "@/components/ui/AppNav";
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

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    ...(hasEventAccess
      ? [
          { href: "/event", label: "Event Brief" },
          { href: "/team", label: "Tim" },
          {
            href: "/songs",
            label: preview ? "Lagu Saya" : admin || canManageEvent(eventRole) ? "Lagu" : observer ? "Lagu" : "Lagu Saya",
          },
        ]
      : []),
    ...(hasEventAccess && (admin || observer) && !preview
      ? [{ href: "/batches", label: "Batch" }]
      : []),
    ...(hasEventAccess
      ? [
          {
            href: "/tasks",
            label: preview ? "Task Saya" : admin ? "Tasks" : observer ? "Tasks & Usulan" : "Task Saya",
          },
          { href: "/rehearsals", label: "Rehearsal" },
          { href: "/equipment", label: "Equipment" },
        ]
      : []),
    ...(hasEventAccess && admin && !preview
      ? [{ href: "/decisions", label: "Keputusan" }]
      : []),
    ...(admin && !preview ? [{ href: "/people", label: "Personel & Akses" }] : []),
    ...(admin && !preview ? [{ href: "/broadcast", label: "Broadcast" }] : []),
  ];

  const eventOptions = events.map(({ id, name, eventType }) => ({
    id,
    name,
    eventType,
  }));
  const desktopControls = (
    <>
      {currentEvent ? (
        <>
          <EventTypeBadge type={currentEvent.eventType} />
          <EventSwitcher
            id="active-event-desktop"
            events={eventOptions}
            selectedEventId={currentEvent.id}
          />
        </>
      ) : null}
      {currentEvent && canToggleView ? (
        <UiModeToggle eventId={currentEvent.id} mode={uiMode} />
      ) : null}
      {preview ? <Badge tone="warning">Pratinjau</Badge> : null}
      <span className="max-w-36 truncate text-sm text-zinc-600 dark:text-zinc-400">
        {user.displayName}
      </span>
      <Badge tone={admin ? "success" : "neutral"}>{roleLabel(user.role)}</Badge>
      <form action={logoutAction}>
        <Button type="submit" variant="secondary" size="sm">
          Keluar
        </Button>
      </form>
    </>
  );
  const mobileControls = (
    <div className="flex min-w-0 flex-col gap-3">
      {currentEvent ? (
        <div className="flex min-w-0 flex-col gap-2">
          <EventTypeBadge type={currentEvent.eventType} />
          <EventSwitcher
            id="active-event-mobile"
            events={eventOptions}
            selectedEventId={currentEvent.id}
          />
        </div>
      ) : null}
      {currentEvent && canToggleView ? (
        <UiModeToggle eventId={currentEvent.id} mode={uiMode} />
      ) : null}
      {preview ? <Badge tone="warning">Pratinjau</Badge> : null}
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
          {user.displayName}
        </span>
        <Badge tone={admin ? "success" : "neutral"}>{roleLabel(user.role)}</Badge>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="secondary" size="sm" className="w-full">
          Keluar
        </Button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <header
        data-app-header=""
        className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mx-auto w-full min-w-0 max-w-screen-2xl px-3 py-2 sm:px-4 lg:px-6 xl:px-8">
          <AppNav
            items={navItems}
            desktopControls={desktopControls}
            mobileControls={mobileControls}
          />
        </div>
      </header>
      <main
        id="konten"
        className="mx-auto w-full min-w-0 max-w-screen-2xl flex-1 px-3 py-6 sm:px-4 lg:px-6 xl:px-8"
      >
        {children}
      </main>
    </div>
  );
}
