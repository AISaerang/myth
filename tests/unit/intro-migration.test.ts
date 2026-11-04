import { describe, expect, it } from "vitest";
import { alignChordsToNotation } from "@/lib/jianpu-align";
import { layoutChordLine } from "@/lib/chords";
import {
  buildIntroSectionContent,
  databaseTargetFromUrl,
  hasIntroMusicalSource,
  introApplyIsBlocked,
  planIntroMigration,
  PROD_DB_USER_PREFIX,
} from "@/lib/intro-migration";

describe("intro section content", () => {
  it("places spaced chords over the not angka line and keeps the note as a comment", () => {
    const content = buildIntroSectionContent({
      introChords: "C   G",
      introNotation: "1' 2 3 4 5",
      introNote: "mainkan pelan",
    });
    expect(content).toBe("[C]1' 2[G] 3 4 5\n# mainkan pelan");
    const layout = layoutChordLine("[C]1' 2[G] 3 4 5");
    const aligned = alignChordsToNotation(layout.chordLine, layout.lyricLine);
    expect(aligned?.chords.map((chord) => [chord.token, chord.renderCol])).toEqual([
      ["C", 0],
      ["G", 3],
    ]);
  });

  it("pairs extra notation lines without repeating the first chord line", () => {
    const content = buildIntroSectionContent({
      introChords: "C   G",
      introNotation: "1' 2 3 4 5\n6 5 4",
      introNote: null,
    });
    expect(content).toBe("[C]1' 2[G] 3 4 5\n6 5 4");
  });

  it("keeps a chord-only intro when there is no notation", () => {
    expect(
      buildIntroSectionContent({
        introChords: "C   G",
        introNotation: "   ",
        introNote: "",
      }),
    ).toBe("[C]   [G]");
  });

  it("ignores a note-only song for the musical source check", () => {
    expect(
      hasIntroMusicalSource({
        introChords: null,
        introNotation: "  ",
        introNote: "hanya catatan",
      }),
    ).toBe(false);
  });
});

describe("intro migration plan", () => {
  const fields = {
    introChords: "C   G",
    introNotation: "1' 2 3 4 5",
    introNote: null,
  };

  it("creates an Intro section and names the active arrangement", () => {
    const plan = planIntroMigration({
      fields,
      sections: [{ type: "VERSE", label: "Verse 1" }],
      activeArrangementName: "Aransemen Manggung",
    });
    expect(plan).toMatchObject({
      action: "create",
      label: "Intro",
      content: "[C]1' 2[G] 3 4 5",
      activeArrangementName: "Aransemen Manggung",
    });
  });

  it("is idempotent when an Intro master section already exists", () => {
    const plan = planIntroMigration({
      fields,
      sections: [{ type: "INTRO", label: "Intro band" }],
      activeArrangementName: "Aransemen Manggung",
    });
    expect(plan).toEqual({ action: "skip-existing" });
  });

  it("picks a unique label when Intro is already used by another type", () => {
    const plan = planIntroMigration({
      fields,
      sections: [{ type: "OTHER", label: "Intro" }],
      activeArrangementName: null,
    });
    expect(plan).toMatchObject({
      action: "create",
      label: "Intro (2)",
      activeArrangementName: null,
    });
  });

  it("skips songs with no chord or notation source", () => {
    expect(
      planIntroMigration({
        fields: { introChords: null, introNotation: null, introNote: "catatan" },
        sections: [],
        activeArrangementName: null,
      }),
    ).toEqual({ action: "skip-empty" });
  });
});

describe("intro migration prod guard", () => {
  it("reads host and user prefix without keeping the password", () => {
    const target = databaseTargetFromUrl(
      "mysql://rGqabc.root:s3cret@gateway.example:4000/music_team_hub",
    );
    expect(target).toEqual({ host: "gateway.example", userPrefix: "rGq" });
    expect(JSON.stringify(target)).not.toContain("s3cret");
    expect(target.userPrefix).toBe(PROD_DB_USER_PREFIX);
  });

  it("blocks apply for the rGq prefix unless --allow-prod is set", () => {
    expect(introApplyIsBlocked("rGq", { apply: true, allowProd: false })).toBe(true);
    expect(introApplyIsBlocked("rGq", { apply: true, allowProd: true })).toBe(false);
    expect(introApplyIsBlocked("rGq", { apply: false, allowProd: false })).toBe(false);
    expect(introApplyIsBlocked("3EP", { apply: true, allowProd: false })).toBe(false);
  });

  it("rejects an empty database url before any apply decision", () => {
    expect(() => databaseTargetFromUrl("")).toThrow(/DATABASE_URL/);
    expect(() => databaseTargetFromUrl(undefined)).toThrow(/DATABASE_URL/);
  });
});
