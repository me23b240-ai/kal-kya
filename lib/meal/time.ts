// The households table has no timezone column, so the app uses one fixed zone.
// India has no daylight saving, so a fixed offset is exact.
const TZ_OFFSET_MIN = 330; // Asia/Kolkata, UTC+05:30

const pad = (n: number) => String(n).padStart(2, "0");

export function todayInZone(nowMs: number): string {
  const d = new Date(nowMs + TZ_OFFSET_MIN * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** A day locks at lock_time on the evening before it (you decide tonight what to cook tomorrow). */
export function lockAtMs(day: string, lockTime: string): number {
  const [y, m, d] = addDays(day, -1).split("-").map(Number);
  const [hh, mm] = lockTime.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - TZ_OFFSET_MIN * 60000;
}

export function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Midnight at the start of the day AFTER `day`, in the app's fixed Asia/Kolkata offset - i.e. the end of `day`. */
export function dayEndMs(day: string): number {
  const [y, m, d] = addDays(day, 1).split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, 0, 0) - 330 * 60000;
}
