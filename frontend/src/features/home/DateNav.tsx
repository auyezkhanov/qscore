import { useCallback, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useDismiss } from "@/shared/hooks/useDismiss";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { addDays, dayKey, formatDate, isSameDay, startOfDay } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { IconButton } from "@/shared/ui/Button";
import { CalendarPopover } from "./CalendarPopover";
import { fullDayLabel, relativeDayLabel } from "./dayLabels";

const STRIP_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

/** Day switcher: prev/next, a label that opens a calendar, and a quick strip of nearby days (sm+). */
export function DateNav({ day, onChange, loading }: { day: Date; onChange: (d: Date) => void; loading: boolean }) {
  const { t, locale } = useI18n();
  const today = startOfDay(new Date());
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    const hadFocus = wrap.current?.contains(document.activeElement) ?? false;
    setOpen(false);
    if (hadFocus) trigger.current?.focus();
  }, []);
  useDismiss(wrap, open, close);

  const pick = (d: Date) => {
    onChange(d);
    close();
  };

  const relative = relativeDayLabel(day, today, t);

  return (
    <div className="card">
      <div className="flex items-center gap-1 p-1.5">
        <IconButton aria-label={t("date.prevDay")} onClick={() => onChange(addDays(day, -1))}>
          <ChevronLeft size={20} />
        </IconButton>

        <div ref={wrap} className="relative flex min-w-0 flex-1 justify-center">
          <button
            ref={trigger}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${t("date.pick")}: ${fullDayLabel(day, locale)}`}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex h-10 min-w-0 max-w-full items-center gap-2 rounded-full px-3 text-[15px] font-bold transition-colors hover:bg-surface-2 sm:px-4",
              open && "bg-surface-2",
            )}
          >
            <CalendarDays size={17} className="shrink-0 text-brand" />
            {relative ? (
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate">{relative}</span>
                <span className="truncate text-[13px] font-medium text-ink-3">{formatDate(day, locale, { day: "numeric", month: "long" })}</span>
              </span>
            ) : (
              <>
                <span className="truncate sm:hidden">{fullDayLabel(day, locale, "short")}</span>
                <span className="hidden truncate sm:inline">{fullDayLabel(day, locale)}</span>
              </>
            )}
            {loading ? (
              <Loader2 size={15} className="shrink-0 animate-spin text-ink-3" aria-label={t("common.loading")} />
            ) : (
              <ChevronDown size={15} className={cn("shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
            )}
          </button>

          {open && (
            <div className="absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2">
              <CalendarPopover selected={day} today={today} onPick={pick} />
            </div>
          )}
        </div>

        <IconButton aria-label={t("date.nextDay")} onClick={() => onChange(addDays(day, 1))}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <div role="group" aria-label={t("home.quickDays")} className="scrollbar-none hidden gap-1 overflow-x-auto border-t border-line p-1.5 sm:flex">
        {STRIP_OFFSETS.map((offset) => {
          const d = addDays(day, offset);
          const selected = offset === 0;
          const isToday = isSameDay(d, today);
          return (
            <button
              key={dayKey(d)}
              type="button"
              onClick={() => onChange(d)}
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={fullDayLabel(d, locale)}
              className={cn(
                "flex min-w-[60px] flex-1 flex-col items-center rounded-xl py-1.5 transition-colors",
                selected ? "bg-brand text-brand-fg" : "hover:bg-surface-2",
              )}
            >
              <span className={cn("text-[11px] font-semibold uppercase", selected ? "text-brand-fg/80" : isToday ? "text-brand" : "text-ink-3")}>
                {isToday ? t("date.today") : formatDate(d, locale, { weekday: "short" })}
              </span>
              <span className={cn("text-sm font-bold tnum", !selected && isToday && "text-brand")}>
                {formatDate(d, locale, { day: "numeric", month: "short" })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
