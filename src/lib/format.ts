const TIME_ZONE = "Asia/Jakarta";

// All timestamps are stored in UTC; displayed in Asia/Jakarta (docs/01).
export function formatJakarta(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}
