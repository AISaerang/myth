export function eventSongDisplayKey(
  eventKey: string | null,
  libraryKey: string | null,
): string | null {
  return eventKey ?? libraryKey;
}
