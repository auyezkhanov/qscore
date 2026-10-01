import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarClock, Goal, ListOrdered, MapPin } from "lucide-react";
import { useStandings } from "@/shared/api/queries";
import type { MatchSummary, SquadPlayer, TeamDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { formatDate, formatTime, startOfDay } from "@/shared/lib/date";
import { cn, formatNumber, resultFor } from "@/shared/lib/utils";
import { Card, CardFooterLink, CardHeader, CardLink } from "@/shared/ui/Card";
import { FormBadge } from "@/shared/ui/FormBadge";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { SkeletonRows } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { MatchList } from "@/features/matches/MatchRow";
import { MatchStatusLabel, isLive } from "@/features/matches/MatchStatus";
import { StandingsTable } from "@/features/standings/StandingsTable";
import { CoachCard } from "./CoachCard";
import { FixtureDifficulty } from "./FixtureDifficulty";

export function TeamOverview({ team }: { team: TeamDetail }) {
  const { t } = useI18n();
  const next = team.upcomingMatches[0];
  const hasStadium = !!team.stadium;
  const widgets = [!!next, team.recentMatches.length > 0, hasStadium].filter(Boolean).length;
  const hasCoach = team.coaches.length > 0;
  const hasFixtures = team.upcomingMatches.length > 0;

  return (
    <div className="space-y-4">
      {widgets > 0 && (
        <div className={cn("grid gap-4", widgets >= 2 && "md:grid-cols-2", widgets === 3 && "xl:grid-cols-3")}>
          {next && <NextMatchCard match={next} />}
          {team.recentMatches.length > 0 && <FormCard matches={team.recentMatches} teamId={team.id} />}
          {team.stadium && <StadiumCard stadium={team.stadium} city={team.city} />}
        </div>
      )}

      {(hasCoach || hasFixtures) && (
        <div className={cn("grid items-start gap-4", hasCoach && hasFixtures && "md:grid-cols-2")}>
          {hasFixtures && <FixtureDifficulty team={team} />}
          {hasCoach && <CoachCard coaches={team.coaches} />}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {team.league && <CompactTable leagueSlug={team.league.slug} leagueName={team.league.name} teamSlug={team.slug} />}
        <TopScorersCard squad={team.squad} />
      </div>

      {team.recentMatches.length > 0 && (
        <MatchList
          title={t("team.results")}
          matches={team.recentMatches}
          showDate
          highlightTeamId={team.id}
          action={<CardLink to="?tab=matches">{t("common.showAll")}</CardLink>}
        />
      )}
    </div>
  );
}

/** "Today", "tomorrow", "in 5 days" — counted in local calendar days. */
function relativeDay(iso: string, locale: string): string {
  const days = Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
}

function NextMatchCard({ match }: { match: MatchSummary }) {
  const { t, locale } = useI18n();
  const live = isLive(match);
  return (
    <Card>
      <CardHeader title={t("team.nextMatch")} icon={<CalendarClock size={16} />} />
      <Link to={`/match/${match.id}`} className="block px-4 py-4 row-hover sm:px-5">
        <div className="mb-3 text-center text-xs font-medium text-ink-3">
          {match.league.name} · {t("match.roundShort", { round: match.round })}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <NextTeam team={match.homeTeam} />
          <div className="flex flex-col items-center gap-1 text-center">
            {live ? (
              <MatchStatusLabel match={match} className="text-lg" />
            ) : (
              <span className="text-xl font-extrabold tnum">{match.timeTbd ? "—:—" : formatTime(match.kickoff, locale)}</span>
            )}
            <span className="whitespace-nowrap text-xs text-ink-2">
              {formatDate(match.kickoff, locale, { day: "numeric", month: "short", weekday: "short" })}
            </span>
            {!live && (
              <span className="mt-0.5 whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                {relativeDay(match.kickoff, locale)}
              </span>
            )}
          </div>
          <NextTeam team={match.awayTeam} />
        </div>
      </Link>
    </Card>
  );
}

function NextTeam({ team }: { team: MatchSummary["homeTeam"] }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo team={team} size="lg" />
      <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{team.name}</span>
    </div>
  );
}

function FormCard({ matches, teamId }: { matches: MatchSummary[]; teamId: string }) {
  const { t, locale } = useI18n();
  // recentMatches is most-recent-first; show oldest → newest, left → right.
  const items = matches.slice(0, 5).reverse();
  return (
    <Card>
      <CardHeader title={t("team.form")} icon={<Activity size={16} />} />
      <div className="flex items-start justify-around gap-1 px-2 py-4 sm:px-4">
        {items.map((m) => {
          const result = resultFor(m, teamId);
          const isHome = m.homeTeam.id === teamId;
          const opponent = isHome ? m.awayTeam : m.homeTeam;
          const label = `${m.homeTeam.name} ${m.homeScore ?? "–"}:${m.awayScore ?? "–"} ${m.awayTeam.name}`;
          return (
            <Link
              key={m.id}
              to={`/match/${m.id}`}
              title={`${label} · ${formatDate(m.kickoff, locale, { day: "numeric", month: "short" })}`}
              aria-label={label}
              className="flex min-w-0 flex-col items-center gap-2 rounded-xl px-1.5 py-2 row-hover"
            >
              <TeamLogo team={opponent} size="md" />
              {result ? (
                <FormBadge result={result} label={`${m.homeScore}-${m.awayScore}`} className="min-w-[2.25rem]" />
              ) : (
                <span className="text-[11px] text-ink-3">—</span>
              )}
              <span className="text-[10px] font-semibold uppercase text-ink-3">{isHome ? t("team.homeShort") : t("team.awayShort")}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

const SURFACES = ["natural", "artificial", "hybrid"] as const;
type Surface = (typeof SURFACES)[number];
const isSurface = (s: string | null): s is Surface => !!s && (SURFACES as readonly string[]).includes(s);

function StadiumCard({ stadium, city }: { stadium: NonNullable<TeamDetail["stadium"]>; city: string | null }) {
  const { t, locale } = useI18n();
  const facts: { label: TranslationKey; value: string }[] = [];
  if (stadium.capacity) facts.push({ label: "team.capacity", value: formatNumber(stadium.capacity, locale) });
  if (stadium.opened) facts.push({ label: "team.opened", value: String(stadium.opened) });
  if (isSurface(stadium.surface)) facts.push({ label: "team.surface", value: t(`team.surface.${stadium.surface}`) });

  return (
    <Card>
      <CardHeader title={t("team.stadium")} icon={<MapPin size={16} />} />
      <div className="px-4 py-4 sm:px-5">
        <p className="text-base font-bold leading-snug">{stadium.name}</p>
        {city && <p className="text-sm text-ink-3">{city}</p>}
        {facts.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t(f.label)}</dt>
                <dd className="truncate text-sm font-semibold tnum">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Card>
  );
}

function CompactTable({ leagueSlug, leagueName, teamSlug }: { leagueSlug: string; leagueName: string; teamSlug: string }) {
  const { t } = useI18n();
  const standings = useStandings(leagueSlug);
  return (
    <Card>
      <CardHeader title={leagueName} icon={<ListOrdered size={16} />} action={<CardLink to="?tab=table">{t("tabs.table")}</CardLink>} />
      <QueryState query={standings} loading={<SkeletonRows rows={8} rowClassName="h-8" />}>
        {(rows) => (rows.length ? <StandingsTable rows={rows} compact highlightSlug={teamSlug} /> : <EmptyState title={t("common.noData")} />)}
      </QueryState>
    </Card>
  );
}

const TOP_N = 5;

function TopScorersCard({ squad }: { squad: SquadPlayer[] }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const scorers = squad.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.minutesPlayed - b.minutesPlayed);
  const shown = expanded ? scorers : scorers.slice(0, TOP_N);

  return (
    <Card className="self-start">
      <CardHeader title={t("team.topScorers")} icon={<Goal size={16} />} />
      {scorers.length === 0 ? (
        <EmptyState title={t("common.noData")} className="py-8" />
      ) : (
        <>
          <ol className="divide-y divide-line">
            {shown.map((p, i) => (
              <li key={p.id}>
                <Link to={`/player/${p.slug}`} className="flex items-center gap-3 px-4 py-2.5 row-hover sm:px-5">
                  <span className="w-5 shrink-0 text-center text-[13px] font-semibold text-ink-3 tnum">{i + 1}</span>
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} number={p.number} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="truncate text-xs text-ink-3">
                      {t(`position.${p.position}`)} · {t("team.appsAssists", { apps: p.appearances, assists: p.assists })}
                    </div>
                  </div>
                  <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-surface-2 px-2 text-[15px] font-extrabold tnum">
                    {p.goals}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {scorers.length > TOP_N && (
            <CardFooterLink onClick={() => setExpanded((v) => !v)}>{expanded ? t("common.showLess") : t("common.showAll")}</CardFooterLink>
          )}
        </>
      )}
    </Card>
  );
}
