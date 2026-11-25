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
  it("does not render an empty general-personnel box", () => {
    const html = markup({
      admin: false,
      canWriteNotes: true,
      canModerateNotes: true,
    });

    expect(html).not.toContain("Semua personel");
    expect(html).not.toContain("Tambah catatan umum");
  });

  it("does not show an empty legacy panel", () => {
    const html = markup({
      canWriteNotes: true,
      canModerateNotes: true,
      displaySectionId: "legacy-synthetic-id",
    });

    expect(html).not.toContain("Semua personel");
    expect(html).not.toContain("Tambah catatan umum");
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

    expect(member).not.toContain("Tambah catatan umum");
    expect(observer).not.toContain("Tambah catatan umum");
    expect(observer).not.toContain("Semua personel");
  });
});
