import { ArrowRight, CalendarX } from "lucide-react";
import { useNextMatchDay } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { addDays, formatDate, parseDayKey } from "@/shared/lib/date";
import { Button } from "@/shared/ui/Button";
import { Skeleton, SkeletonRows } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { MatchRow } from "@/features/matches/MatchRow";

const PREVIEW = 4;

/** No fixtures on the selected day: say so and preview the next day that has some. */
export function EmptyDay({ day, onJump }: { day: Date; onJump: (d: Date) => void }) {
  const { t, locale } = useI18n();
  const next = useNextMatchDay(addDays(day, 1));

  return (
    <section className="card overflow-hidden">
      <EmptyState icon={<CalendarX size={22} />} title={t("home.noMatches")} className="py-10" />
      <QueryState
        query={next}
        errorClassName="border-t border-line py-8"
        loading={
          <div className="border-t border-line" aria-busy="true">
            <div className="px-4 pt-4">
              <Skeleton className="h-4 w-48" />
            </div>
            <SkeletonRows rows={3} rowClassName="h-10" />
          </div>
        }
      >
        {({ date, matches }) => {
          const nextDay = parseDayKey(date);
          if (!nextDay || matches.length === 0) return null;
          return (
            <div className="border-t border-line">
              <h3 className="px-4 pb-2 pt-4 text-[13px] font-bold text-ink-2 sm:px-5">
                {t("home.nextMatchDay", { date: formatDate(nextDay, locale, { weekday: "long", day: "numeric", month: "long" }) })}
              </h3>
              <div className="divide-y divide-line">
                {matches.slice(0, PREVIEW).map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </div>
              <div className="flex justify-center border-t border-line p-3">
                <Button size="sm" onClick={() => onJump(nextDay)}>
                  {t("home.jumpToDay")}
                  <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          );
        }}
      </QueryState>
    </section>
  );
}
