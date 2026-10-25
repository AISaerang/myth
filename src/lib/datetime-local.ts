// Format/parse nilai <input type="datetime-local"> dalam zona WIB (Asia/Jakarta, UTC+7).
// Sengaja tanpa "use client" agar bisa dipakai di Server Component maupun klien.

export const JAKARTA_TZ = "Asia/Jakarta";
export const JAKARTA_OFFSET = "+07:00";

/** Date → "YYYY-MM-DDTHH:mm" dalam jam WIB, terlepas dari zona server. */
export function toJakartaLocalInput(value?: Date | string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: JAKARTA_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const LOCAL_INPUT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;

/** "YYYY-MM-DDTHH:mm" tanpa zona → Date yang ditafsirkan sebagai WIB. String berzona dibiarkan. */
export function parseJakartaLocalInput(value: string): Date {
  const v = value.trim();
  if (LOCAL_INPUT_RE.test(v)) {
    const withSeconds = v.length === 16 ? `${v}:00` : v;
    return new Date(`${withSeconds}${JAKARTA_OFFSET}`);
  }
  return new Date(v);
}
