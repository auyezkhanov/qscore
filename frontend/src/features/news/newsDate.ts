import { formatDate, formatRelative, parseDayKey, startOfDay } from "@/shared/lib/date";

// The feed often publishes a bare calendar date ("2026-09-24") rather than a
// timestamp. Parsed with `new Date()` that would be UTC midnight (the wrong day
// west of UTC) and "5 hours ago" would be made up, so bare dates are treated as
// local calendar days and described in days.

/** Publication moment as a Date; bare "YYYY-MM-DD" becomes local midnight. */
export function newsDate(iso: string): Date {
  return parseDayKey(iso) ?? new Date(iso);
}

/** "3 hours ago" / "yesterday" / "12 September" for a news item. */
export function formatNewsTime(iso: string, locale: string, now = new Date()): string {
  const day = parseDayKey(iso);
  if (!day) return formatRelative(iso, locale, now.getTime());
  const today = startOfDay(now);
  const days = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (days >= 0 && days < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-days, "day");
  }
  return formatDate(day, locale, { day: "numeric", month: "long", year: day.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/** Full date for the article header: "24 September 2026". */
export function formatNewsDate(iso: string, locale: string): string {
  return formatDate(newsDate(iso), locale, { day: "numeric", month: "long", year: "numeric" });
}
