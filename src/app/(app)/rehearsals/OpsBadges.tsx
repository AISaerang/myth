import { Badge } from "@/components/ui/Badge";
import type {
  AttendanceStatus,
  DecisionType,
  EquipmentStatus,
  RehearsalStatus,
  RehearsalType,
} from "@/generated/prisma/client";
import {
  ATTENDANCE_STATUS_LABEL,
  DECISION_TYPE_LABEL,
  EQUIPMENT_STATUS_LABEL,
  REHEARSAL_STATUS_LABEL,
  REHEARSAL_TYPE_LABEL,
} from "@/lib/rehearsal-labels";

export function RehearsalTypeBadge({ type }: { type: RehearsalType }) {
  return <Badge tone="neutral">{REHEARSAL_TYPE_LABEL[type]}</Badge>;
}

export function RehearsalStatusBadge({ status }: { status: RehearsalStatus }) {
  const tone =
    status === "COMPLETED"
      ? ("success" as const)
      : status === "CANCELLED"
        ? ("danger" as const)
        : status === "RESCHEDULED"
          ? ("warning" as const)
          : ("neutral" as const);
  return <Badge tone={tone}>{REHEARSAL_STATUS_LABEL[status]}</Badge>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const tone =
    status === "PRESENT"
      ? ("success" as const)
      : status === "ABSENT"
        ? ("danger" as const)
        : status === "LATE" || status === "EXCUSED"
          ? ("warning" as const)
          : ("neutral" as const);
  return <Badge tone={tone}>{ATTENDANCE_STATUS_LABEL[status]}</Badge>;
}

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const tone =
    status === "TESTED" || status === "CONFIRMED"
      ? ("success" as const)
      : status === "BLOCKED"
        ? ("danger" as const)
        : status === "NEEDED"
          ? ("warning" as const)
          : ("neutral" as const);
  return <Badge tone={tone}>{EQUIPMENT_STATUS_LABEL[status]}</Badge>;
}

export function DecisionTypeBadge({ type }: { type: DecisionType }) {
  return <Badge tone="neutral">{DECISION_TYPE_LABEL[type]}</Badge>;
}
