import type { EventType } from "@/generated/prisma/client";

export function eventTypeLabel(type: EventType): string {
  return type === "INTERNAL_GEHC" ? "GEHC" : "Regional";
}
