import { CalendarClock, Target } from "lucide-react";
import { useNextMatchDay } from "@/shared/api/queries";
import type { PredictionFixture } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { dayKey, formatDate, parseDayKey, startOfDay } from "@/shared/lib/date";
import { EmptyState } from "@/shared/ui/States";
import { LiveDot, isLive } from "@/features/matches/MatchStatus";
import { fullDayLabel, relativeDayLabel } from "@/features/home/dayLabels";
import { PredictionCard } from "./PredictionCard";

const GRID = "grid gap-3 md:grid-cols-2 xl:grid-cols-3";

/** Open fixtures grouped by local day, with matches in progress (locked) on top. */
export function PredictTab({ fixtures, signedIn, onRequireAuth }: { fixtures: PredictionFixture[]; signedIn: boolean; onRequireAuth: () => void }) {
  const { t, locale } = useI18n();
  const live = fixtures.filter((f) => isLive(f.match));
  const open = fixtures.filter((f) => f.open && !isLive(f.match));
  const done = open.filter((f) => f.prediction).length;

  const groups = new Map<string, PredictionFixture[]>();
  for (const f of [...open].sort((a, b) => a.match.kickoff.localeCompare(b.match.kickoff))) {
    const key = dayKey(new Date(f.match.kickoff));
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  const days = [...groups];

  const today = startOfDay(new Date());
  const card = (f: PredictionFixture) => <PredictionCard key={f.match.id} fixture={f} signedIn={signedIn} onRequireAuth={onRequireAuth} />;

  return (
    <div className="space-y-5">
      {signedIn && open.length > 0 && <Progress done={done} total={open.length} />}

      {live.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-2 px-1 text-[13px] font-bold uppercase tracking-wide text-live">
            <LiveDot />
            {t("predictor.live")}
          </h2>
          <div className={GRID}>{live.map(card)}</div>
        </section>
      )}

      {days.map(([key, list]) => {
        const day = parseDayKey(key) ?? today;
        const relative = relativeDayLabel(day, today, t);
        return (
          <section key={key} className="space-y-2.5">
            <h2 className="flex items-baseline gap-2 px-1 text-[15px] font-bold tracking-tight">
              {relative ?? fullDayLabel(day, locale)}
              {relative && <span className="text-[13px] font-medium text-ink-3">{formatDate(day, locale, { day: "numeric", month: "long" })}</span>}
            </h2>
            <div className={GRID}>{list.map(card)}</div>
          </section>
        );
      })}

      {open.length === 0 && live.length === 0 && <NoFixtures />}
    </div>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  const { t } = useI18n();
  const pct = Math.round((done / total) * 100);
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Target size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("predictor.progress", { done, total })}</p>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={t("predictor.progress", { done, total })}
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="shrink-0 text-sm font-extrabold text-ink-2 tnum">
        {done}/{total}
      </span>
    </div>
  );
}

/** Nothing open right now: point at the next match day. */
function NoFixtures() {
  const { t, locale } = useI18n();
  const next = useNextMatchDay(startOfDay(new Date()));
  const nextDay = parseDayKey(next.data?.date);
  return (
    <div className="card">
      <EmptyState
        icon={<CalendarClock size={22} />}
        title={t("predictor.empty.title")}
        text={
          <>
            {nextDay && (
              <span className="mb-1 block font-semibold text-ink-2">
                {t("predictor.empty.next", { date: formatDate(nextDay, locale, { weekday: "long", day: "numeric", month: "long" }) })}
              </span>
            )}
            {t("predictor.empty.text")}
          </>
        }
      />
    </div>
  );
}
