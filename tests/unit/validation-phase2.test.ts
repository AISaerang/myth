import { describe, expect, it } from "vitest";
import { eventSchema } from "@/lib/validation/event";
import {
  personSchema,
  personSkillSchema,
  skillSchema,
} from "@/lib/validation/personnel";

const validEvent = {
  name: "Ibadah Pemuda Wilayah",
  eventStatus: "DRAFT",
};

describe("event validation", () => {
  it("accepts a minimal draft event", () => {
    expect(eventSchema.safeParse(validEvent).success).toBe(true);
  });

  it("rejects short names and bad statuses", () => {
    expect(
      eventSchema.safeParse({ ...validEvent, name: "AB" }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({ ...validEvent, eventStatus: "GOSIP" }).success,
    ).toBe(false);
  });

  it("rejects end time before start time", () => {
    const parsed = eventSchema.safeParse({
      ...validEvent,
      startTime: "19:00",
      endTime: "18:00",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid time range and date", () => {
    const parsed = eventSchema.safeParse({
      ...validEvent,
      eventDate: "2026-11-22",
      startTime: "17:00",
      endTime: "20:00",
      targetDurationMinutes: "180",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.eventDate).toBeInstanceOf(Date);
      expect(parsed.data.targetDurationMinutes).toBe(180);
    }
  });

  it("rejects non-positive durations and non-http urls", () => {
    expect(
      eventSchema.safeParse({ ...validEvent, targetDurationMinutes: "-5" })
        .success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({
        ...validEvent,
        liturgicalFlowUrl: "ftp://drive/contoh",
      }).success,
    ).toBe(false);
  });

  it("treats empty optional strings as undefined", () => {
    const parsed = eventSchema.safeParse({
      ...validEvent,
      venue: "",
      liturgicalFlowUrl: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.liturgicalFlowUrl).toBeUndefined();
    }
  });
});

describe("personnel validation", () => {
  it("accepts a minimal person and parses confirmation", () => {
    const parsed = personSchema.safeParse({
      displayName: "Gitar 1",
      isConfirmed: "on",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.isConfirmed).toBe(true);
  });

  it("rejects short names and long skills", () => {
    expect(
      personSchema.safeParse({ displayName: "A" }).success,
    ).toBe(false);
    expect(skillSchema.safeParse({ name: "x".repeat(51) }).success).toBe(
      false,
    );
  });

  it("requires both sides of a skill assignment", () => {
    expect(
      personSkillSchema.safeParse({ personId: "p1" }).success,
    ).toBe(false);
    expect(
      personSkillSchema.safeParse({
        personId: "p1",
        instrumentSkillId: "s1",
      }).success,
    ).toBe(true);
  });
});
