import { describe, expect, it } from "vitest";
import { parseJakartaLocalInput, toJakartaLocalInput } from "@/lib/datetime-local";
import { rehearsalSchema } from "@/lib/validation/operations";

describe("toJakartaLocalInput", () => {
  it("memformat instant UTC ke jam WIB", () => {
    expect(toJakartaLocalInput(new Date("2026-10-28T12:00:00Z"))).toBe("2026-10-28T19:00");
    expect(toJakartaLocalInput("2026-11-14T00:00:00Z")).toBe("2026-11-14T07:00");
  });
  it("melewati batas hari", () => {
    expect(toJakartaLocalInput(new Date("2026-11-12T20:30:00Z"))).toBe("2026-11-13T03:30");
  });
  it("kosong/invalid → string kosong", () => {
    expect(toJakartaLocalInput(null)).toBe("");
    expect(toJakartaLocalInput(undefined)).toBe("");
    expect(toJakartaLocalInput("bukan tanggal")).toBe("");
  });
});

describe("parseJakartaLocalInput", () => {
  it("menafsirkan input tanpa zona sebagai +07:00", () => {
    expect(parseJakartaLocalInput("2026-11-13T15:00").toISOString()).toBe("2026-11-13T08:00:00.000Z");
  });
  it("round-trip tanpa pergeseran jam", () => {
    const v = "2026-10-31T10:00";
    expect(toJakartaLocalInput(parseJakartaLocalInput(v))).toBe(v);
  });
  it("string berzona tidak diubah", () => {
    expect(parseJakartaLocalInput("2026-11-14T00:00:00Z").toISOString()).toBe("2026-11-14T00:00:00.000Z");
  });
});

describe("rehearsalSchema parsing WIB", () => {
  it("startsAt input form disimpan sebagai +07:00", () => {
    const r = rehearsalSchema.safeParse({
      eventId: "e1", title: "Gladi", type: "ONLINE_MONITORING",
      startsAt: "2026-11-13T15:00", endsAt: "2026-11-13T18:00", status: "SCHEDULED",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.startsAt.toISOString()).toBe("2026-11-13T08:00:00.000Z");
      expect(r.data.endsAt?.toISOString()).toBe("2026-11-13T11:00:00.000Z");
    }
  });
});
