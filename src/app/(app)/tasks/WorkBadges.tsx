import { Badge } from "@/components/ui/Badge";
import type { PracticeStatus, TaskPriority, TaskStatus } from "@/generated/prisma/client";
import { PRACTICE_STATUS_LABEL } from "@/lib/practice-status";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/task-status";

export function PracticeStatusBadge({ status }: { status: PracticeStatus }) {
  const tone =
    status === "READY_FOR_REHEARSAL"
      ? ("success" as const)
      : status === "NEEDS_HELP"
        ? ("danger" as const)
        : ("neutral" as const);
  return <Badge tone={tone}>{PRACTICE_STATUS_LABEL[status]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone =
    status === "DONE"
      ? ("success" as const)
      : status === "BLOCKED"
        ? ("danger" as const)
        : status === "IN_PROGRESS"
          ? ("warning" as const)
          : ("neutral" as const);
  return <Badge tone={tone}>{TASK_STATUS_LABEL[status]}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone =
    priority === "CRITICAL"
      ? ("danger" as const)
      : priority === "HIGH"
        ? ("warning" as const)
        : ("neutral" as const);
  return <Badge tone={tone}>{TASK_PRIORITY_LABEL[priority]}</Badge>;
}

export function OverdueBadge() {
  return <Badge tone="danger">Terlambat</Badge>;
}
