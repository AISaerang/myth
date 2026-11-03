"use client";

import type { EventType } from "@/generated/prisma/client";
import { EventSwitcher } from "@/components/ui/EventSwitcher";

export function EventPicker({
  events,
  value,
}: {
  events: { id: string; name: string; eventType: EventType }[];
  value: string;
}) {
  return (
    <EventSwitcher
      events={events}
      selectedEventId={value}
      label="Event:"
    />
  );
}
