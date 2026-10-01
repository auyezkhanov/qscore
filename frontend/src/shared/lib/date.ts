// All calendar logic works in the viewer's LOCAL time zone. Never derive a
// calendar day from toISOString() — that's UTC and shifts matches played after
// local midnight onto the wrong day.

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for the local calendar day of `d`. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of a "YYYY-MM-DD" key; null for malformed input. */
export function parseDayKey(key: string | null | undefined): Date | null {
  const m = key?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) || dayKey(d) !== key ? null : d;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** [start, end) of the local calendar day as ISO strings, for API range queries. */
export function dayRange(d: Date): { from: string; to: string } {
  const start = startOfDay(d);
  return { from: start.toISOString(), to: addDays(start, 1).toISOString() };
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDate(iso: string | Date, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }): string {
  return (typeof iso === "string" ? new Date(iso) : iso).toLocaleDateString(locale, opts);
}

/** Human "5 minutes ago" style label; falls back to a date after a week. */
export function formatRelative(iso: string, locale: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(iso, locale, { day: "numeric", month: "long", year: new Date(iso).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}
