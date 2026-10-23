import { describe, expect, it } from "vitest";
import {
  composeArrangementContent,
  inferSectionType,
  makeUniqueSectionLabel,
  parseLegacyChart,
} from "@/lib/chart-arrangement";

describe("inferSectionType", () => {
  it("maps common labels", () => {
    expect(inferSectionType("Verse 1")).toBe("VERSE");
    expect(inferSectionType("Reff")).toBe("CHORUS");
    expect(inferSectionType("Pre-Chorus")).toBe("PRE_CHORUS");
    expect(inferSectionType("Bridge")).toBe("BRIDGE");
    expect(inferSectionType("Coda")).toBe("CODA");
    expect(inferSectionType("Bagian 1")).toBe("OTHER");
  });

  it("maps standard section headings comprehensively", () => {
    expect(inferSectionType("Modulation")).toBe("KEY_CHANGE");
    expect(inferSectionType("Modulasi ke G")).toBe("KEY_CHANGE");
    expect(inferSectionType("Key Change")).toBe("KEY_CHANGE");
    expect(inferSectionType("Transposisi modulasi")).toBe("KEY_CHANGE");
    expect(inferSectionType("Tagline")).toBe("TAG");
    expect(inferSectionType("Post-Chorus")).toBe("POST_CHORUS");
    expect(inferSectionType("Pre-Bridge")).toBe("PRE_BRIDGE");
    expect(inferSectionType("Solo Gitar")).toBe("SOLO");
    expect(inferSectionType("Hook")).toBe("HOOK");
    expect(inferSectionType("Riff")).toBe("HOOK");
    expect(inferSectionType("Breakdown")).toBe("BREAKDOWN");
    expect(inferSectionType("Vamp")).toBe("VAMP");
    expect(inferSectionType("Turnaround")).toBe("TURNAROUND");
    expect(inferSectionType("Ad-lib")).toBe("ADLIB");
    expect(inferSectionType("Spoken")).toBe("SPOKEN");
    expect(inferSectionType("Narrasi")).toBe("SPOKEN");
    expect(inferSectionType("Transition")).toBe("TRANSITION");
    expect(inferSectionType("Link")).toBe("TRANSITION");
    expect(inferSectionType("Reprise")).toBe("REPRISE");
  });

  it("keeps chorus type for modulated chorus labels", () => {
    expect(inferSectionType("Chorus — modulasi ke G")).toBe("CHORUS");
  });
});

describe("parseLegacyChart", () => {
  it("splits labeled sections and strips headings", () => {
    const parsed = parseLegacyChart(
      "{Verse 1}\n[G]Bapa sentuh\n\n{Reff}\n[C]Hallelujah",
    );
    expect(parsed).toEqual([
      { label: "Verse 1", type: "VERSE", content: "[G]Bapa sentuh" },
      { label: "Reff", type: "CHORUS", content: "[C]Hallelujah" },
    ]);
  });

  it("keeps unlabeled content as a section", () => {
    const parsed = parseLegacyChart("[G]Tanpa label\n[Em]Tetap aman");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.label).toBe("Bagian 1");
    expect(parsed[0]?.content).toContain("[G]Tanpa label");
  });

  it("handles leading unlabeled content and CRLF", () => {
    const parsed = parseLegacyChart(
      "[C]Intro tanpa label\r\n{Verse}\r\n[G]Verse isi",
    );
    expect(parsed.map((s) => s.label)).toEqual(["Bagian 1", "Verse"]);
  });

  it("ignores empty sections", () => {
    const parsed = parseLegacyChart("{Verse}\n\n{Chorus}\n[C]isi");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.label).toBe("Chorus");
  });
});

describe("composeArrangementContent", () => {
  const verse = { label: "Verse 1", content: "[G]Bapa sentuh" };
  const chorus = { label: "Chorus", content: "[C]Hallelujah" };

  it("keeps arrangement order and repeats", () => {
    const content = composeArrangementContent([
      { section: verse },
      { section: chorus },
      { section: verse },
    ]);
    expect(content.match(/\{Verse 1\}/g)).toHaveLength(2);
    expect(content.indexOf("{Verse 1}")).toBeLessThan(
      content.indexOf("{Chorus}"),
    );
    expect(content.lastIndexOf("{Verse 1}")).toBeGreaterThan(
      content.indexOf("{Chorus}"),
    );
  });

  it("uses label override and skips empty content", () => {
    const content = composeArrangementContent([
      { section: chorus, labelOverride: "Chorus 2" },
      { section: { label: "Kosong", content: "  " } },
    ]);
    expect(content).toBe("{Chorus 2}\n[C]Hallelujah");
  });
});

describe("makeUniqueSectionLabel", () => {
  it("suffixes duplicates without exceeding 50 chars", () => {
    const used = new Set(["Verse"]);
    expect(makeUniqueSectionLabel("Verse", used)).toBe("Verse (2)");
    const long = "x".repeat(50);
    const result = makeUniqueSectionLabel(long, new Set([long]));
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("(2)")).toBe(true);
  });
});
