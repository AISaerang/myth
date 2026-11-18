// Mode Edit | Preview is a per-browser, per-event UI preference.
// It is not a session role and is never an input to canWriteEventData.

export const UI_MODE_COOKIE = "myth_ui_mode";

export type UiMode = "edit" | "preview";

const EVENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function parsePreviewEventIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const ids: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!EVENT_ID.test(id) || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= 20) break;
  }
  return ids;
}

export function uiModeForEvent(
  raw: string | undefined | null,
  eventId: string,
): UiMode {
  return parsePreviewEventIds(raw).includes(eventId) ? "preview" : "edit";
}

export function withUiMode(
  raw: string | undefined | null,
  eventId: string,
  mode: UiMode,
): string {
  const ids = new Set(parsePreviewEventIds(raw));
  if (EVENT_ID.test(eventId)) {
    if (mode === "preview") ids.add(eventId);
    else ids.delete(eventId);
  }
  return [...ids].join(",");
}

// Managers in Preview use the musician song path. The flag does not
// change User.role, EventMembership, or mutation guards.
export function showMusicianSongView(isManager: boolean, mode: UiMode): boolean {
  return !isManager || mode === "preview";
}
