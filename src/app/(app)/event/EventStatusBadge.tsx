import { Badge } from "@/components/ui/Badge";
import type { EventStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PENDING_CONFIRMATION: "Menunggu konfirmasi",
  CONFIRMED: "Terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_TONE = {
  DRAFT: "neutral",
  PENDING_CONFIRMATION: "warning",
  CONFIRMED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
} as const;

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
