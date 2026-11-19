import { describe, expect, it } from "vitest";
import {
  preferredInstrumentPov,
  roleTabVisible,
} from "@/lib/arrangement-roles";
import { transposeContent } from "@/lib/chords";
import { decideSongEdit } from "@/lib/permissions";

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

  it("transposes Gitar Lead content with the existing chart offset", () => {
    expect(transposeContent("[C]Melodi", 5)).toContain("[F]Melodi");
    expect(transposeContent("[C]Melodi", 0)).toContain("[C]Melodi");
    expect(transposeContent("1 2 3", 5)).toBe("1 2 3");
  });

  it("keeps MEMBER and Pantau out of arrangement mutations", () => {
    const base = {
      eventId: "event-1",
      songLinkedToEvent: true,
      accessClosed: false,
      globalAdmin: false,
    };
    expect(decideSongEdit({ ...base, eventRole: "MEMBER" }).ok).toBe(false);
    expect(decideSongEdit({ ...base, eventRole: "OBSERVER" }).ok).toBe(false);
    expect(decideSongEdit({
      ...base,
      eventRole: "EVENT_ADMIN",
    }).ok).toBe(true);
  });
});
