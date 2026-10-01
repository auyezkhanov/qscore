import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarX2, RotateCcw, Tv } from "lucide-react";
import { useTvSchedule } from "@/shared/api/queries";
import type { TvMatch } from "@/shared/api/types";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { Page } from "@/shared/ui/Container";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { TvDayCard } from "@/features/tv/TvDayCard";
import { TvFilters } from "@/features/tv/TvFilters";
import { channelNames, channelsOf, groupByDay, leaguesOf } from "@/features/tv/schedule";

const DAYS = 14;

export default function TvPage() {
  const { t } = useI18n();
  const query = useTvSchedule(DAYS);
  useDocumentTitle(t("tv.title"));

  return (
    <Page>
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-center gap-3 px-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Tv size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">{t("tv.title")}</h1>
            <p className="text-[13px] text-ink-3">{t("tv.subtitle", { n: DAYS })}</p>
          </div>
        </header>
        <QueryState
          query={query}
          errorClassName="card"
          loading={
            <>
              <SkeletonCard rows={3} rowClassName="h-14" />
              <SkeletonCard rows={2} rowClassName="h-14" />
            </>
          }
        >
          {(matches) => <Schedule matches={matches} />}
        </QueryState>
      </div>
    </Page>
  );
}

function Schedule({ matches }: { matches: TvMatch[] }) {
  const { t, locale } = useI18n();
  const [params, setParams] = useSearchParams();
  const leagues = leaguesOf(matches);
  const channels = channelNames(matches, locale);
  // Ignore stale URL values that no longer match anything in the schedule.
  const league = leagues.find((l) => l.slug === params.get("league"))?.slug ?? null;
  const channel = channels.find((c) => c === params.get("channel")) ?? null;

  const setParam = useCallback(
    (key: "league" | "channel", value: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  if (matches.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={<Tv size={22} />} title={t("tv.empty")} text={t("tv.emptyText")} />
      </div>
    );
  }

  const filtered = matches.filter((m) => (league == null || m.league.slug === league) && (channel == null || channelsOf(m).some((b) => b.name === channel)));
  const days = groupByDay(filtered);

  return (
    <>
      <TvFilters
        leagues={leagues}
        channels={channels}
        league={league}
        channel={channel}
        onLeague={(v) => setParam("league", v)}
        onChannel={(v) => setParam("channel", v)}
      />
      {days.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CalendarX2 size={22} />}
            title={t("tv.noResults")}
            action={
              <Button variant="secondary" size="sm" onClick={() => setParams({}, { replace: true })}>
                <RotateCcw size={14} />
                {t("tv.reset")}
              </Button>
            }
          />
        </div>
      ) : (
        days.map((d) => <TvDayCard key={d.key} date={d.date} matches={d.matches} />)
      )}
    </>
  );
}
