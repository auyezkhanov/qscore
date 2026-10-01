import { Swords } from "lucide-react";
import type { HeadToHead, MatchDetail, TeamRef } from "@/shared/api/types";
import { useHeadToHead } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { MatchList } from "@/features/matches/MatchRow";

/** Previous meetings of the two clubs. Mounted only when its tab is open, so it fetches lazily. */
export function MatchHeadToHead({ match }: { match: MatchDetail }) {
  const { t } = useI18n();
  const query = useHeadToHead(match.id);

  return (
    <QueryState query={query} loading={<SkeletonCard rows={4} rowClassName="h-14" />} errorClassName="card">
      {(h2h) =>
        h2h.summary.total === 0 && h2h.matches.length === 0 ? (
          <EmptyState className="card" icon={<Swords size={22} />} title={t("h2h.none")} />
        ) : (
          <div className="space-y-4">
            <Summary summary={h2h.summary} home={match.homeTeam} away={match.awayTeam} />
            {h2h.matches.length > 0 && <MatchList title={t("h2h.last")} matches={h2h.matches} showDate />}
          </div>
        )
      }
    </QueryState>
  );
}

function Summary({ summary, home, away }: { summary: HeadToHead["summary"]; home: TeamRef; away: TeamRef }) {
  const { t } = useI18n();
  const segments = [
    { key: "home", value: summary.homeWins, className: "bg-brand" },
    { key: "draw", value: summary.draws, className: "bg-draw/50" },
    { key: "away", value: summary.awayWins, className: "bg-ink-2" },
  ].filter((s) => s.value > 0);

  return (
    <section className="card p-4 sm:p-5">
      <div className="grid grid-cols-3 items-end gap-2 text-center">
        <Tally team={home} value={summary.homeWins} label={t("h2h.wins")} valueClassName="text-brand" />
        <Tally value={summary.draws} label={t("h2h.draws")} valueClassName="text-ink-2" />
        <Tally team={away} value={summary.awayWins} label={t("h2h.wins")} valueClassName="text-ink" />
      </div>
      {segments.length > 0 && (
        <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {segments.map((s) => (
            <div key={s.key} className={cn("h-full", s.className)} style={{ flexGrow: s.value }} />
          ))}
        </div>
      )}
      <p className="mt-3 text-center text-xs font-medium text-ink-3">{t("h2h.total", { n: summary.total })}</p>
    </section>
  );
}

function Tally({ team, value, label, valueClassName }: { team?: TeamRef; value: number; label: string; valueClassName: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      {team ? <TeamLogo team={team} size="lg" /> : <span className="h-10" aria-hidden />}
      <span className={cn("text-3xl font-extrabold leading-none tnum", valueClassName)}>{value}</span>
      <span className="text-xs font-medium text-ink-3">
        {label}
        {team && <span className="sr-only"> · {team.name}</span>}
      </span>
    </div>
  );
}
