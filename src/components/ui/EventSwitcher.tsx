"use client";

import type { EventType } from "@/generated/prisma/client";
import { setActiveEventAction } from "@server/actions/event";

export interface EventOption {
  id: string;
  name: string;
  eventType: EventType;
}

export function EventSwitcher({
  events,
  selectedEventId,
  label = "Event aktif",
}: {
  events: EventOption[];
  selectedEventId: string;
  label?: string;
}) {
  if (events.length < 2) return null;

  return (
    <form action={setActiveEventAction} className="flex min-w-0 items-center gap-2 text-sm">
      <label htmlFor="active-event" className="sr-only sm:not-sr-only">
        {label}
      </label>
      <select
        id="active-event"
        name="eventId"
        defaultValue={selectedEventId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700 shadow-sm transition-colors focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:max-w-64"
      >
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            [{event.eventType === "INTERNAL_GEHC" ? "GEHC" : "Regional"}] {event.name}
          </option>
        ))}
      </select>
    </form>
  );
}
