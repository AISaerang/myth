import { Badge } from "@/components/ui/Badge";
import type { EventType } from "@/generated/prisma/client";
import { eventTypeLabel } from "@/lib/event-type";

export function EventTypeBadge({ type }: { type: EventType }) {
  return <Badge tone={type === "INTERNAL_GEHC" ? "warning" : "neutral"}>{eventTypeLabel(type)}</Badge>;
}
