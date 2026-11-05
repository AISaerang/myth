import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventForm } from "@/app/(app)/event/EventForm";
import {
  parseJakartaDateInput,
  toJakartaDateInput,
} from "@/lib/datetime-local";
import {
  eventSchema,
  resolveEventStatusUpdate,
} from "@/lib/validation/event";

const eventName = "Ibadah Pemuda Wilayah";

describe("event date round-trip in WIB", () => {
  it("shows 7 Nov WIB in the date input, not the previous UTC day", () => {
    const stored = new Date("2026-11-06T17:00:00.000Z");
    expect(stored.toISOString().slice(0, 10)).toBe("2026-11-06");
    expect(toJakartaDateInput(stored)).toBe("2026-11-07");
  });

  it("saves that date input back to the same instant", () => {
    const stored = new Date("2026-11-06T17:00:00.000Z");
    const input = toJakartaDateInput(stored);
    expect(parseJakartaDateInput(input).toISOString()).toBe(stored.toISOString());

    const parsed = eventSchema.safeParse({
      name: eventName,
      eventStatus: "CONFIRMED",
      eventDate: input,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.eventDate?.toISOString()).toBe("2026-11-06T17:00:00.000Z");
    expect(toJakartaDateInput(parsed.data.eventDate)).toBe("2026-11-07");
  });

  it("stores a date-only form value at midnight WIB", () => {
    expect(parseJakartaDateInput("2026-11-07").toISOString()).toBe(
      "2026-11-06T17:00:00.000Z",
    );
    expect(new Date("2026-11-07").toISOString()).toBe("2026-11-07T00:00:00.000Z");
  });

  it("leaves an empty date unset", () => {
    const parsed = eventSchema.safeParse({
      name: eventName,
      eventStatus: "CONFIRMED",
      eventDate: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.eventDate).toBeUndefined();
  });
});

describe("event edit form markup", () => {
  it("fills the Jakarta date and the stored status, and does not mark status as edited", () => {
    const html = renderToStaticMarkup(
      createElement(EventForm, {
        mode: "edit",
        eventId: "evt-1",
        defaults: {
          name: "Full rehearsal",
          eventDate: "2026-11-07",
          eventStatus: "CONFIRMED",
        },
      }),
    );
    expect(html).toContain('id="eventDate"');
    expect(html).toContain('value="2026-11-07"');
    expect(html).toContain('name="eventStatusChanged"');
    expect(html).toContain('value="0"');
    expect(html).toContain(
      '<option value="CONFIRMED" selected="">Terkonfirmasi</option>',
    );
    expect(html).not.toContain(
      '<option value="DRAFT" selected="">Draft</option>',
    );
  });
});

describe("event status update", () => {
  it("keeps the stored status when the status field was not changed", () => {
    expect(resolveEventStatusUpdate("CONFIRMED", "DRAFT", false)).toBe(
      "CONFIRMED",
    );
    expect(
      resolveEventStatusUpdate("PENDING_CONFIRMATION", "DRAFT", false),
    ).toBe("PENDING_CONFIRMATION");
  });

  it("applies a status the user changed, including Draft", () => {
    expect(resolveEventStatusUpdate("CONFIRMED", "COMPLETED", true)).toBe(
      "COMPLETED",
    );
    expect(resolveEventStatusUpdate("CONFIRMED", "DRAFT", true)).toBe("DRAFT");
  });
});
