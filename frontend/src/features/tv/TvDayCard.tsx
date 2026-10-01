import { Link } from "react-router-dom";
import { Tv } from "lucide-react";
import type { TeamRef, TvMatch } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { CardHeader } from "@/shared/ui/Card";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { BroadcasterList } from "@/features/broadcast/BroadcasterList";
import { LiveDot, MatchStatusLabel, hasScore, isLive } from "@/features/matches/MatchStatus";
import { capitalize, fullDayLabel, relativeDayLabel } from "@/features/home/dayLabels";
import { channelsOf } from "./schedule";

/** One local day of the TV schedule. */
export function TvDayCard({ date, matches }: { date: Date; matches: TvMatch[] }) {
  const { t, locale } = useI18n();
  const relative = relativeDayLabel(date, new Date(), t);
  const title = relative ? `${relative} · ${capitalize(date.toLocaleDateString(locale, { day: "numeric", month: "long" }))}` : fullDayLabel(date, locale);
  const liveCount = matches.filter(isLive).length;

  return (
    <section className="card overflow-hidden" aria-label={title}>
      <CardHeader
        title={title}
        action={
          <span className="flex items-center gap-1.5">
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[11px] font-bold text-live tnum">
                <LiveDot />
                {liveCount}
              </span>
            )}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2 tnum" title={t("tv.count", { n: matches.length })}>
              {matches.length}
            </span>
          </span>
        }
      />
      <ul className="divide-y divide-line">
        {matches.map((m) => (
          <TvMatchRow key={m.id} match={m} />
        ))}
      </ul>
    </section>
  );
}

function TvMatchRow({ match: m }: { match: TvMatch }) {
  const { t } = useI18n();
  const live = isLive(m);
  const channels = channelsOf(m);

  return (
    <li
      className={cn(
        "relative grid grid-cols-[52px_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[60px_minmax(0,1fr)_minmax(0,auto)] sm:items-center sm:gap-x-4 sm:px-4",
        live && "bg-live/[0.05]",
      )}
    >
      {live && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-live" aria-hidden />}

      <div className="flex flex-col items-center justify-center gap-1.5 text-[13px] leading-none">
        <MatchStatusLabel match={m} />
        <span title={m.league.name} className="inline-flex">
          <LeagueBadge slug={m.league.slug} size="sm" />
          <span className="sr-only">{m.league.name}</span>
        </span>
      </div>

      <Link to={`/match/${m.id}`} className="group -my-1 min-w-0 rounded-lg py-1">
        <TeamLine team={m.homeTeam} score={hasScore(m) ? m.homeScore : null} live={live} />
        <TeamLine team={m.awayTeam} score={hasScore(m) ? m.awayScore : null} live={live} className="mt-1.5" />
      </Link>

      <div className="col-start-2 min-w-0 sm:col-start-auto sm:max-w-[280px] sm:justify-self-end">
        {channels.length > 0 ? (
          <BroadcasterList broadcasters={channels} size="sm" className="sm:justify-end" />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
            <Tv size={13} aria-hidden />
            {t("tv.noBroadcast")}
          </span>
        )}
      </div>
    </li>
  );
}

function TeamLine({ team, score, live, className }: { team: TeamRef; score: number | null; live: boolean; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <TeamLogo team={team} size="sm" />
      <span className="truncate text-sm font-semibold group-hover:underline">{team.name}</span>
      {score != null && <span className={cn("ml-auto pl-2 text-sm font-bold tnum", live ? "text-live" : "text-ink")}>{score}</span>}
    </span>
  );
}
