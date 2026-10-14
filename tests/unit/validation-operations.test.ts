import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_STATUS_LABEL,
  DECISION_TYPE_LABEL,
  EQUIPMENT_STATUS_LABEL,
  isUpcomingRehearsal,
  REHEARSAL_STATUS_LABEL,
  REHEARSAL_TYPE_LABEL,
} from "@/lib/rehearsal-labels";
import {
  attendanceSchema,
  decisionSchema,
  equipmentSchema,
  rehearsalSchema,
} from "@/lib/validation/operations";

describe("operations labels", () => {
  it("covers all rehearsal types and statuses", () => {
    expect(REHEARSAL_TYPE_LABEL.FULL_REHEARSAL).toBe("Full rehearsal");
    expect(REHEARSAL_STATUS_LABEL.RESCHEDULED).toBe("Dijadwal ulang");
    expect(ATTENDANCE_STATUS_LABEL.EXCUSED).toBe("Izin");
    expect(EQUIPMENT_STATUS_LABEL.NOT_APPLICABLE).toBe("N/A");
    expect(DECISION_TYPE_LABEL.TECHNICAL).toBe("Teknis");
  });

  it("excludes cancelled/completed/past rehearsals from upcoming", () => {
    const future = new Date("2026-11-20T10:00:00+07:00");
    const now = new Date("2026-11-01T00:00:00Z");
    expect(isUpcomingRehearsal("SCHEDULED", future, now)).toBe(true);
    expect(isUpcomingRehearsal("CANCELLED", future, now)).toBe(false);
    expect(isUpcomingRehearsal("COMPLETED", future, now)).toBe(false);
    expect(
      isUpcomingRehearsal("SCHEDULED", new Date("2026-10-01T00:00:00Z"), now),
    ).toBe(false);
  });
});

describe("rehearsal validation", () => {
  const base = {
    eventId: "e1",
    title: "Monitoring online Batch 1",
    type: "ONLINE_MONITORING",
    startsAt: "2026-11-10T19:00",
    status: "SCHEDULED",
  };

  it("accepts a minimal rehearsal", () => {
    expect(rehearsalSchema.safeParse(base).success).toBe(true);
  });

  it("rejects end before start", () => {
    expect(
      rehearsalSchema.safeParse({
        ...base,
        endsAt: "2026-11-10T18:00",
      }).success,
    ).toBe(false);
    expect(
      rehearsalSchema.safeParse({ ...base, endsAt: "2026-11-10T20:30" }).success,
    ).toBe(true);
  });
});

describe("equipment validation", () => {
  const base = {
    eventId: "e1",
    name: "Kabel XLR cadangan",
    category: "Kabel",
    status: "NEEDED",
  };

  it("accepts minimal items and defaults quantity to 1", () => {
    const parsed = equipmentSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.quantity).toBe(1);
  });

  it("requires a PIC for BLOCKED", () => {
    expect(equipmentSchema.safeParse({ ...base, status: "BLOCKED" }).success).toBe(
      false,
    );
    expect(
      equipmentSchema.safeParse({
        ...base,
        status: "BLOCKED",
        assigneePersonId: "p1",
      }).success,
    ).toBe(true);
  });

  it("rejects zero quantities", () => {
    expect(equipmentSchema.safeParse({ ...base, quantity: "0" }).success).toBe(
      false,
    );
  });
});

describe("attendance and decision validation", () => {
  it("validates attendance rows", () => {
    expect(
      attendanceSchema.safeParse({
        rehearsalId: "r1",
        personId: "p1",
        status: "PRESENT",
      }).success,
    ).toBe(true);
    expect(
      attendanceSchema.safeParse({ rehearsalId: "r1", personId: "p1", status: "HADIR" })
        .success,
    ).toBe(false);
  });

  it("requires decision content", () => {
    expect(
      decisionSchema.safeParse({ eventId: "e1", title: "OK", decisionType: "MUSICAL" })
        .success,
    ).toBe(false);
    expect(
      decisionSchema.safeParse({
        eventId: "e1",
        title: "Key lagu pembuka",
        decisionType: "MUSICAL",
        decisionText: "Main di D, capo 2 untuk gitar.",
      }).success,
    ).toBe(true);
  });
});
