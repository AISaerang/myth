import type { TaskPriority, TaskStatus } from "@/generated/prisma/client";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "Berjalan",
  BLOCKED: "Blocked",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
};

export function isActiveTaskStatus(status: TaskStatus): boolean {
  return status === "TODO" || status === "IN_PROGRESS" || status === "BLOCKED";
}

// Overdue = melewati due date dan belum selesai/dibatalkan (docs/10).
export function isTaskOverdue(
  status: TaskStatus,
  dueAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!dueAt) return false;
  if (status === "DONE" || status === "CANCELLED") return false;
  const due = dueAt instanceof Date ? dueAt : new Date(dueAt);
  return due.getTime() < now.getTime();
}
