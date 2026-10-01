import type { TFunction } from "@/shared/i18n/LanguageProvider";
import { addDays, formatDate, isSameDay } from "@/shared/lib/date";

export const capitalize = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

/** "Today" / "Yesterday" / "Tomorrow", or null for any other day. */
export function relativeDayLabel(day: Date, today: Date, t: TFunction): string | null {
  if (isSameDay(day, today)) return t("date.today");
  if (isSameDay(day, addDays(today, -1))) return t("date.yesterday");
  if (isSameDay(day, addDays(today, 1))) return t("date.tomorrow");
  return null;
}

/** "Thursday, 17 September" (+ year when it isn't the current one). */
export function fullDayLabel(day: Date, locale: string, weekday: "long" | "short" = "long"): string {
  const year = day.getFullYear() === new Date().getFullYear() ? undefined : "numeric";
  return capitalize(formatDate(day, locale, { weekday, day: "numeric", month: "long", year }));
}
