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
  id = "active-event",
}: {
  events: EventOption[];
  selectedEventId: string;
  label?: string;
  id?: string;
}) {
  if (events.length < 2) return null;

  return (
    <form
      action={setActiveEventAction}
      className="flex w-full min-w-0 flex-col gap-1 text-sm sm:w-auto sm:flex-row sm:items-center sm:gap-2"
    >
      <label htmlFor={id} className="text-xs text-zinc-500 sm:text-sm">
        {label}
      </label>
      <div className="min-w-0 w-full sm:max-w-64">
        <select
          id={id}
          name="eventId"
          defaultValue={selectedEventId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-ellipsis text-zinc-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus-visible:outline-zinc-100"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              [{event.eventType === "INTERNAL_GEHC" ? "GEHC" : "Regional"}] {event.name}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
