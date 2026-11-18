import { describe, expect, it } from "vitest";
import { canWriteEventData } from "@/lib/permissions";
import {
  parsePreviewEventIds,
  showMusicianSongView,
  uiModeForEvent,
  withUiMode,
} from "@/lib/ui-mode";

describe("Edit | Preview UI mode", () => {
  it("stores preview per event and leaves other events in edit", () => {
    const stored = withUiMode("", "event-a", "preview");
    expect(uiModeForEvent(stored, "event-a")).toBe("preview");
    expect(uiModeForEvent(stored, "event-b")).toBe("edit");
    expect(uiModeForEvent(withUiMode(stored, "event-a", "edit"), "event-a")).toBe(
      "edit",
    );
  });

  it("does not change canWriteEventData when the cookie says preview", () => {
    const mode = uiModeForEvent("event-a", "event-a");
    expect(mode).toBe("preview");
    expect(showMusicianSongView(true, mode)).toBe(true);
    expect(showMusicianSongView(true, "edit")).toBe(false);
    expect(canWriteEventData("EVENT_ADMIN", false, false)).toBe(true);
    expect(canWriteEventData("EVENT_ADMIN", true, false)).toBe(false);
    expect(canWriteEventData("MEMBER", false, false)).toBe(false);
    expect(canWriteEventData(null, false, true)).toBe(true);
  });

  it("ignores values that are not event ids", () => {
    expect(parsePreviewEventIds("not an id,../etc,event-a")).toEqual(["event-a"]);
    expect(uiModeForEvent("not an id,../etc,event-a", "event-a")).toBe("preview");
  });
});
