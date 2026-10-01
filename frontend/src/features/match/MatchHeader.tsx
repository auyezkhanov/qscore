import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Flag, MapPin, Play, Tv, Users } from "lucide-react";
import type { MatchDetail, MatchEvent, TeamRef } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate, formatTime } from "@/shared/lib/date";
import { cn, formatNumber } from "@/shared/lib/utils";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { Skeleton } from "@/shared/ui/Skeleton";
import { BroadcasterList } from "@/features/broadcast/BroadcasterList";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { FollowButton } from "@/features/push/FollowButton";
import { MatchStatusLabel, hasScore, isLive } from "@/features/matches/MatchStatus";
import { BallIcon } from "./EventIcons";
import { GOAL_TYPES, minuteLabel, sortEvents, surname } from "./format";

type Scorer = { key: string; name: string; own: boolean; minutes: string[] };

/** Goals credited to one side, grouped by player: "Gual 23′, 67′ (pen)". */
function scorersFor(events: MatchEvent[], side: "home" | "away", penShort: string, ogShort: string): Scorer[] {
  const byPlayer = new Map<string, Scorer>();
  for (const e of sortEvents(events)) {
    if (e.side !== side || !GOAL_TYPES.has(e.type)) continue;
    const name = e.player?.name ?? "?";
    const own = e.type === "OWN_GOAL";
    const key = `${e.player?.id ?? name}:${own ? "og" : "g"}`;
    const suffix = e.type === "PENALTY_GOAL" ? ` (${penShort})` : e.type === "OWN_GOAL" ? ` (${ogShort})` : "";
    const entry = byPlayer.get(key) ?? { key, name, own, minutes: [] };
    entry.minutes.push(minuteLabel(e) + suffix);
    byPlayer.set(key, entry);
  }
  return [...byPlayer.values()];
}

/** Scoreboard card; `children` (the tab bar) is docked to its bottom edge. */
export function MatchHeader({ match, onWatch, children }: { match: MatchDetail; onWatch: () => void; children?: ReactNode }) {
  const { t, locale } = useI18n();
  const scored = hasScore(match);
  const live = isLive(match);
  const finished = match.status === "FINISHED";
  const canFollow = !finished && match.status !== "CANCELLED";
  const penShort = t("match.penShort");
  const ogShort = t("match.ownGoalShort");

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line py-1.5 pl-4 pr-2 sm:pl-5">
        <Link to={`/league/${match.league.slug}`} className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-ink">
          <LeagueBadge slug={match.league.slug} size="sm" />
          <span className="truncate">{match.league.name}</span>
          <span className="shrink-0 text-ink-3">·</span>
          <span className="shrink-0 font-medium text-ink-3">{t("match.round", { round: match.round })}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          {canFollow && <FollowButton kind="match" id={match.id} variant="icon" />}
          <FavoriteButton matchId={match.id} size={18} />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 px-3 pb-5 pt-5 sm:gap-6 sm:px-6 sm:pt-7">
        <TeamColumn team={match.homeTeam} scorers={scorersFor(match.events, "home", penShort, ogShort)} align="right" />

        <div className="flex min-w-[96px] flex-col items-center pt-2 text-center sm:min-w-[150px] sm:pt-4">
          {scored ? (
            <div className={cn("flex items-center gap-2 text-4xl font-extrabold leading-none tracking-tight tnum sm:gap-3 sm:text-5xl", live && "text-live")}>
              <span>{match.homeScore}</span>
              <span className="text-2xl text-ink-3 sm:text-3xl">-</span>
              <span>{match.awayScore}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold leading-none tracking-tight tnum sm:text-4xl">
                {match.timeTbd ? "—:—" : formatTime(match.kickoff, locale)}
              </span>
              <span className="mt-1.5 text-xs font-medium text-ink-3">{formatDate(match.kickoff, locale, { day: "numeric", month: "short" })}</span>
            </div>
          )}
          {(scored || match.status !== "SCHEDULED") && <MatchStatusLabel match={match} variant="long" className="mt-2.5 text-[13px]" />}
          {match.homePenaltyScore != null && match.awayPenaltyScore != null && (
            <span className="mt-1 text-xs font-semibold text-ink-2 tnum">{t("match.penalties", { home: match.homePenaltyScore, away: match.awayPenaltyScore })}</span>
          )}

          {match.youtubeUrl && !finished ? (
            <button
              type="button"
              onClick={onWatch}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-live px-3.5 text-[13px] font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95"
            >
              <Play size={13} className="fill-current" />
              {t("match.watch")}
            </button>
          ) : finished && match.highlightsUrl ? (
            <a
              href={match.highlightsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-semibold text-ink transition hover:bg-surface-3 active:scale-95"
            >
              <Play size={13} className="fill-current text-live" />
              {t("match.highlights")}
            </a>
          ) : null}
        </div>

        <TeamColumn team={match.awayTeam} scorers={scorersFor(match.events, "away", penShort, ogShort)} align="left" />
      </div>

      <MatchInfoStrip match={match} />
      {children && <div className="border-t border-line">{children}</div>}
    </section>
  );
}

function TeamColumn({ team, scorers, align }: { team: TeamRef; scorers: Scorer[]; align: "left" | "right" }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <Link to={`/team/${team.slug}`} className="group flex min-w-0 flex-col items-center gap-2.5">
        <TeamLogo team={team} size="xl" className="transition-transform group-hover:scale-105 sm:h-20 sm:w-20" />
        <span className="line-clamp-2 break-words text-sm font-bold leading-tight group-hover:underline sm:text-lg">{team.name}</span>
      </Link>
      {scorers.length > 0 && (
        <ul className={cn("mt-2.5 space-y-0.5 text-[11px] leading-snug text-ink-2 sm:text-xs", align === "right" ? "sm:text-right" : "sm:text-left", "sm:self-stretch")}>
          {scorers.map((s) => (
            <li key={s.key} className={cn("flex items-start justify-center gap-1", align === "right" ? "sm:justify-end" : "sm:justify-start")}>
              <BallIcon size={11} own={s.own} className="mt-[2px] hidden sm:block" />
              <span className="min-w-0">
                <span className="font-semibold text-ink">{surname(s.name)}</span> <span className="tnum">{s.minutes.join(", ")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchInfoStrip({ match }: { match: MatchDetail }) {
  const { t, locale } = useI18n();
  const date = formatDate(match.kickoff, locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const time = match.timeTbd ? t("date.tbd") : formatTime(match.kickoff, locale);
  const venue = [match.stadium, match.city].filter(Boolean).join(", ");

  return (
    <dl className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-line bg-surface-2/50 px-4 py-3 text-[13px] text-ink-2">
      <InfoItem icon={<CalendarDays size={14} />} label={t("match.date")}>
        {date}, {time}
      </InfoItem>
      {venue && (
        <InfoItem icon={<MapPin size={14} />} label={t("match.stadium")}>
          {venue}
        </InfoItem>
      )}
      {match.referee && (
        <InfoItem icon={<Flag size={14} />} label={t("match.referee")}>
          {match.referee}
        </InfoItem>
      )}
      {match.attendance != null && match.attendance > 0 && (
        <InfoItem icon={<Users size={14} />} label={t("match.attendance")}>
          <span className="tnum">{formatNumber(match.attendance, locale)}</span>
        </InfoItem>
      )}
      {match.status !== "FINISHED" && match.status !== "CANCELLED" && match.broadcasters.length > 0 && (
        <InfoItem icon={<Tv size={14} />} label={t("match.whereToWatch")}>
          <BroadcasterList broadcasters={match.broadcasters} size="sm" />
        </InfoItem>
      )}
    </dl>
  );
}

function InfoItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={label}>
      <dt className="shrink-0 text-ink-3">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export function MatchHeaderSkeleton() {
  return (
    <div className="card overflow-hidden" aria-busy="true">
      <div className="border-b border-line px-5 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-3 items-center gap-4 px-6 py-7">
        {[0, 1, 2].map((i) =>
          i === 1 ? (
            <Skeleton key={i} className="mx-auto h-10 w-24" />
          ) : (
            <div key={i} className="flex flex-col items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full sm:h-20 sm:w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ),
        )}
      </div>
      <div className="border-t border-line px-5 py-3">
        <Skeleton className="mx-auto h-4 w-2/3" />
      </div>
    </div>
  );
}
