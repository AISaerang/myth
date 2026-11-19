import { describe, expect, it } from "vitest";
import {
  preferredInstrumentPov,
  roleTabVisible,
} from "@/lib/arrangement-roles";

describe("arrangement role tabs", () => {
  it("hides empty tabs and shows tabs with content", () => {
    expect(roleTabVisible({ sections: {} })).toBe(false);
    expect(roleTabVisible({ sections: { s1: { notes: "   " } } })).toBe(false);
    expect(roleTabVisible({ sections: { s1: { pattern: "4-on-floor" } } })).toBe(true);
  });

  it("maps skill names to preferred POV and falls back safely", () => {
    expect(preferredInstrumentPov("Gitar Lead", ["guitar_lead"])).toBe("guitar_lead");
    expect(preferredInstrumentPov("Lead Guitar", [])).toBe("guitar");
    expect(preferredInstrumentPov("Piano Layer", ["piano_layer"])).toBe("piano_layer");
    expect(preferredInstrumentPov("Keyboard", [])).toBe("piano");
    expect(preferredInstrumentPov("Drums", [])).toBe("drum");
    expect(preferredInstrumentPov("Bass", [])).toBe("bass");
    expect(preferredInstrumentPov("Paduan Suara", [])).toBe("vocal");
    expect(preferredInstrumentPov("Unknown", [])).toBe("chart");
  });
});
