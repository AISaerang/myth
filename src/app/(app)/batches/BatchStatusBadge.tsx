import { Badge } from "@/components/ui/Badge";
import type { BatchStatus } from "@/generated/prisma/client";
import { BATCH_STATUS_LABEL } from "@/lib/batch-status";

const TONE: Record<BatchStatus, "neutral" | "success" | "warning"> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  REVIEWING: "warning",
  COMPLETED: "success",
  ARCHIVED: "neutral",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge tone={TONE[status]}>{BATCH_STATUS_LABEL[status]}</Badge>;
}
