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
    <form action={setActiveEventAction} className="flex items-center gap-2 text-sm">
      <label htmlFor="active-event">{label}</label>
      <select
        id="active-event"
        name="eventId"
        defaultValue={selectedEventId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 max-w-64 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
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
