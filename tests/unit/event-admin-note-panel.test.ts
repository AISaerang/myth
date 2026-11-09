import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChordChartSection } from "@/app/(app)/songs/[id]/ChordChartSection";

const section = { id: "sec-verse", label: "Verse", type: "VERSE" };

function markup(opts: {
  admin?: boolean;
  canWriteNotes?: boolean;
  canModerateNotes?: boolean;
  displaySectionId?: string;
}) {
  return renderToStaticMarkup(
    createElement(ChordChartSection, {
      songId: "song-1",
      eventId: "cmw5u5hnr000008jgmqjalsw9",
      eventSongId: "es-1",
      admin: opts.admin ?? false,
      charts: [],
      arrangement: {
        name: "Utama",
        content: "{Verse}\n[C]Damai",
        sections: [
          {
            id: opts.displaySectionId ?? "not-a-master-section",
            label: "Verse",
            content: "[C]Damai",
          },
        ],
      },
      sections: [section],
      notes: [],
      noteTargetOptions: [{ id: "skill-keys", name: "Keyboard" }],
      canWriteNotes: opts.canWriteNotes ?? false,
      canModerateNotes: opts.canModerateNotes ?? false,
      currentUserId: "lorenzo",
      defaultPart: "Keyboard",
    }),
  );
}

describe("song page note panel for EVENT_ADMIN", () => {
  it("shows Semua personel and Tambah catatan umum without a global admin flag", () => {
    const html = markup({
      admin: false,
      canWriteNotes: true,
      canModerateNotes: true,
    });

    expect(html).toContain("Semua personel");
    expect(html).toContain("Tambah catatan umum");
    expect(html).toContain("Catatan per instrumen");
    expect(html).toContain("Tambah catatan instrumen");
  });

  it("still shows the panel when the chart section id is not a master id", () => {
    const html = markup({
      canWriteNotes: true,
      canModerateNotes: true,
      displaySectionId: "legacy-synthetic-id",
    });

    expect(html).toContain("Semua personel");
    expect(html).toContain("Tambah catatan umum");
  });

  it("does not add that editor box for a member or observer", () => {
    const member = markup({
      canWriteNotes: true,
      canModerateNotes: false,
      displaySectionId: "sec-verse",
    });
    const observer = markup({
      canWriteNotes: false,
      canModerateNotes: false,
      displaySectionId: "legacy-synthetic-id",
    });

    expect(member.match(/Tambah catatan umum/g)?.length ?? 0).toBe(1);
    expect(observer).not.toContain("Tambah catatan umum");
    expect(observer).not.toContain("Semua personel");
  });
});
