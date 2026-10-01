import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarX, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { LeagueRounds } from "@/shared/api/types";
import { useLeagueRounds } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { IconButton } from "@/shared/ui/Button";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { MatchList } from "@/features/matches/MatchRow";

/** Fixtures of one round with a prev/next + dropdown navigator; the round lives in `?round=`. */
export function LeagueRoundMatches({ slug }: { slug: string }) {
  const query = useLeagueRounds(slug);
  return (
    <QueryState query={query} loading={<SkeletonCard rows={8} rowClassName="h-12" />} errorClassName="card">
      {(data) => <RoundBrowser data={data} />}
    </QueryState>
  );
}

function RoundBrowser({ data }: { data: LeagueRounds }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const rounds = data.rounds;

  const setRound = useCallback(
    (round: number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("round", String(round));
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  if (rounds.length === 0) {
    return <EmptyState className="card" icon={<CalendarX size={22} />} title={t("league.noMatches")} />;
  }

  const requested = Number(params.get("round"));
  const fallback = rounds.some((r) => r.round === data.currentRound) ? data.currentRound! : rounds[rounds.length - 1].round;
  const index = Math.max(
    0,
    rounds.findIndex((r) => r.round === (rounds.some((x) => x.round === requested) ? requested : fallback)),
  );
  const current = rounds[index];

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between gap-2 p-1.5">
        <IconButton aria-label={t("league.prevRound")} disabled={index === 0} onClick={() => setRound(rounds[index - 1].round)}>
          <ChevronLeft size={20} />
        </IconButton>
        <label className="relative min-w-0">
          <span className="sr-only">{t("league.selectRound")}</span>
          <select
            value={current.round}
            onChange={(e) => setRound(Number(e.target.value))}
            className="h-10 max-w-full cursor-pointer appearance-none truncate rounded-full bg-surface-2 pl-5 pr-10 text-sm font-bold text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {rounds.map((r) => (
              <option key={r.round} value={r.round}>
                {r.round === data.currentRound ? `${t("match.round", { round: r.round })} · ${t("league.current")}` : t("match.round", { round: r.round })}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-3" />
        </label>
        <IconButton aria-label={t("league.nextRound")} disabled={index === rounds.length - 1} onClick={() => setRound(rounds[index + 1].round)}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <MatchList matches={current.matches} showDate empty={<EmptyState icon={<CalendarX size={22} />} title={t("league.noMatches")} />} />
    </div>
  );
}
