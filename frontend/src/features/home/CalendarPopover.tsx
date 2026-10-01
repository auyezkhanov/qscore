import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { addDays, dayKey, formatDate, isSameDay } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button, IconButton } from "@/shared/ui/Button";
import { capitalize } from "./dayLabels";

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
// 1 Jan 2024 was a Monday: used to get localized weekday names, Monday first.
const WEEK = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i));

/** Month grid date picker (Monday first). Arrow keys move between days. */
export function CalendarPopover({ selected, today, onPick }: { selected: Date; today: Date; onPick: (d: Date) => void }) {
  const { t, locale } = useI18n();
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    grid.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  }, []);

  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const start = addDays(month, -offset);
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => addDays(start, i));
  const title = `${capitalize(new Intl.DateTimeFormat(locale, { month: "long" }).format(month))} ${month.getFullYear()}`;

  const shiftMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEP[e.key];
    if (!step || !grid.current) return;
    const buttons = [...grid.current.querySelectorAll<HTMLButtonElement>("button")];
    const i = buttons.findIndex((b) => b === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    buttons[Math.min(buttons.length - 1, Math.max(0, i + step))]?.focus();
  };

  return (
    <div role="dialog" aria-label={t("date.pick")} className="w-[300px] rounded-2xl border border-line bg-surface p-3 shadow-pop animate-pop-in">
      <div className="mb-2 flex items-center justify-between">
        <IconButton size="sm" aria-label={t("date.prevMonth")} onClick={() => shiftMonth(-1)}>
          <ChevronLeft size={18} />
        </IconButton>
        <span className="text-sm font-bold" aria-live="polite">
          {title}
        </span>
        <IconButton size="sm" aria-label={t("date.nextMonth")} onClick={() => shiftMonth(1)}>
          <ChevronRight size={18} />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 pb-1" aria-hidden>
        {WEEK.map((d) => (
          <span key={d.getDay()} className="py-1 text-center text-[11px] font-semibold uppercase text-ink-3">
            {formatDate(d, locale, { weekday: "short" })}
          </span>
        ))}
      </div>

      <div ref={grid} className="grid grid-cols-7 gap-y-0.5" onKeyDown={onKeyDown}>
        {cells.map((d) => {
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <button
              key={dayKey(d)}
              type="button"
              onClick={() => onPick(d)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={formatDate(d, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              className={cn(
                "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] tnum transition-colors",
                isSelected
                  ? "bg-brand font-bold text-brand-fg"
                  : cn("hover:bg-surface-2", isToday && "font-bold text-brand ring-1 ring-inset ring-brand", !isToday && (inMonth ? "text-ink" : "text-ink-3/60")),
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex justify-center border-t border-line pt-2">
        <Button variant="ghost" size="sm" onClick={() => onPick(today)} className="text-brand hover:text-brand">
          {t("date.backToToday")}
        </Button>
      </div>
    </div>
  );
}
