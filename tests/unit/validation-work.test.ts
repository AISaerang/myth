import { describe, expect, it } from "vitest";
import {
  isHelpNeeded,
  PRACTICE_STATUS_LABEL,
  PRACTICE_STATUS_ORDER,
} from "@/lib/practice-status";
import {
  isActiveTaskStatus,
  isTaskOverdue,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from "@/lib/task-status";
import {
  progressSchema,
  taskSchema,
  taskStatusUpdateSchema,
} from "@/lib/validation/work";

describe("practice progress", () => {
  it("covers all 5 spec statuses", () => {
    expect(PRACTICE_STATUS_ORDER).toHaveLength(5);
    for (const s of PRACTICE_STATUS_ORDER) {
      expect(PRACTICE_STATUS_LABEL[s]).toBeTruthy();
    }
    expect(isHelpNeeded("NEEDS_HELP")).toBe(true);
    expect(isHelpNeeded("LEARNING")).toBe(false);
  });

  it("validates progress input", () => {
    expect(
      progressSchema.safeParse({ songId: "s1", status: "LEARNING" }).success,
    ).toBe(true);
    expect(
      progressSchema.safeParse({ songId: "s1", status: "HAMPIR_BISA" }).success,
    ).toBe(false);
    expect(
      progressSchema.safeParse({ songId: "", status: "LEARNING" }).success,
    ).toBe(false);
  });
});

describe("task validation", () => {
  const base = {
    eventId: "e1",
    title: "Siapkan click lagu pembuka",
    status: "TODO",
    priority: "HIGH",
  };

  it("accepts a minimal task", () => {
    expect(taskSchema.safeParse(base).success).toBe(true);
    expect(TASK_STATUS_LABEL.TODO).toBe("Todo");
    expect(TASK_PRIORITY_LABEL.CRITICAL).toBe("Kritis");
  });

  it("requires owner + follow-up for BLOCKED", () => {
    expect(taskSchema.safeParse({ ...base, status: "BLOCKED" }).success).toBe(
      false,
    );
    expect(
      taskSchema.safeParse({
        ...base,
        status: "BLOCKED",
        assigneePersonId: "p1",
      }).success,
    ).toBe(false);
    expect(
      taskSchema.safeParse({
        ...base,
        status: "BLOCKED",
        assigneePersonId: "p1",
        description: "Hubungi soundman untuk kabel cadangan",
      }).success,
    ).toBe(true);
  });

  it("computes overdue correctly", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    expect(
      isTaskOverdue("IN_PROGRESS", new Date("2026-10-30T00:00:00Z"), now),
    ).toBe(true);
    expect(isTaskOverdue("DONE", new Date("2026-10-30T00:00:00Z"), now)).toBe(
      false,
    );
    expect(isTaskOverdue("TODO", null, now)).toBe(false);
    expect(isTaskOverdue("BLOCKED", new Date("2026-11-05T00:00:00Z"), now)).toBe(
      false,
    );
  });

  it("distinguishes active from finished statuses", () => {
    expect(isActiveTaskStatus("BLOCKED")).toBe(true);
    expect(isActiveTaskStatus("DONE")).toBe(false);
    expect(isActiveTaskStatus("CANCELLED")).toBe(false);
    expect(taskStatusUpdateSchema.safeParse({ status: "DONE" }).success).toBe(
      true,
    );
  });
});
