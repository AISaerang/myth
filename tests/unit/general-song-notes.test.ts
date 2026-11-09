import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionGeneralNotePanel } from "@/app/(app)/songs/[id]/SongNotes";
import {
  canWriteSongNotes,
  type SessionUser,
} from "@/lib/permissions";

const eventAdmin: SessionUser = {
  id: "lorenzo",
  username: "lorenzo",
  displayName: "Lorenzo",
  role: "USER",
  mustChangePassword: false,
};

const member: SessionUser = { ...eventAdmin, id: "member" };
const observer: SessionUser = { ...eventAdmin, id: "obs", role: "OBSERVER" };
const admin: SessionUser = { ...eventAdmin, id: "admin", role: "ADMIN" };

function panel(canWrite: boolean) {
  return renderToStaticMarkup(
    createElement(SectionGeneralNotePanel, {
      songId: "song-1",
      eventSongId: "es-1",
      sectionId: "sec-verse",
      notes: [],
      sections: [{ id: "sec-verse", label: "Verse", type: "VERSE" }],
      targetOptions: [],
      defaultPart: "Keyboard",
      canWrite,
      canModerate: canWrite,
      currentUserId: "lorenzo",
    }),
  );
}

describe("general song notes for event admins", () => {
  it("lets an EVENT_ADMIN write on an open event, including drafts", () => {
    expect(canWriteSongNotes(eventAdmin, "EVENT_ADMIN", false, false)).toBe(true);
    expect(canWriteSongNotes(eventAdmin, "EVENT_ADMIN", false, true)).toBe(true);
    expect(canWriteSongNotes(eventAdmin, "EVENT_ADMIN", true, true)).toBe(false);
    expect(canWriteSongNotes(admin, "EVENT_ADMIN", true, false)).toBe(true);
  });

  it("does not change member or observer write access", () => {
    expect(canWriteSongNotes(member, "MEMBER", false, true)).toBe(true);
    expect(canWriteSongNotes(member, "MEMBER", false, false)).toBe(false);
    expect(canWriteSongNotes(observer, "OBSERVER", false, true)).toBe(false);
    expect(canWriteSongNotes(member, "OBSERVER", false, true)).toBe(false);
    expect(canWriteSongNotes(eventAdmin, null, false, true)).toBe(false);
  });

  it("shows Semua personel and Tambah catatan umum when writing is allowed", () => {
    const markup = panel(true);
    expect(markup).toContain("Semua personel");
    expect(markup).toContain("Tambah catatan umum");
    expect(markup).toContain("<summary");
  });

  it("hides the empty general-note composer when writing is not allowed", () => {
    expect(panel(false)).toBe("");
  });
});
