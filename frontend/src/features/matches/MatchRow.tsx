import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Tv } from "lucide-react";
import type { MatchSummary } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { MatchStatusLabel, hasScore, isLive } from "./MatchStatus";

/**
 * One fixture in a list: status | home — score — away | favourite.
 * `showDate` prefixes the date (for lists spanning several days);
 * `highlightTeamId` bolds that side and colours the score by result.
 */
export function MatchRow({
  match,
  showDate = false,
  showFavorite = true,
  highlightTeamId,
}: {
  match: MatchSummary;
  showDate?: boolean;
  showFavorite?: boolean;
  highlightTeamId?: string;
}) {
  const { t, locale } = useI18n();
  const live = isLive(match);
  const scored = hasScore(match);
  const homeWon = scored && match.homeScore! > match.awayScore!;
  const awayWon = scored && match.awayScore! > match.homeScore!;
  const finished = match.status === "FINISHED";

  return (
    <Link
      to={`/match/${match.id}`}
      className={cn("group relative grid grid-cols-[52px_minmax(0,1fr)_auto_minmax(0,1fr)_32px] items-center gap-x-2 px-2 py-2.5 row-hover sm:grid-cols-[64px_minmax(0,1fr)_auto_minmax(0,1fr)_36px] sm:px-3", live && "bg-live/[0.04]")}
    >
      {live && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-live" />}
      <div className="flex flex-col items-center justify-center text-center text-xs leading-tight">
        {showDate && <span className="mb-0.5 text-[11px] font-medium text-ink-3">{formatDate(match.kickoff, locale, { day: "numeric", month: "short" })}</span>}
        <MatchStatusLabel match={match} />
      </div>

      <TeamSide team={match.homeTeam} align="right" bold={finished ? homeWon : highlightTeamId === match.homeTeam.id} dim={finished && awayWon} />

      <div className="flex min-w-[52px] flex-col items-center justify-center sm:min-w-[60px]">
        {scored ? (
          <span className={cn("rounded-md px-2 py-0.5 text-[15px] font-bold tnum", live ? "text-live" : "text-ink")}>
            {match.homeScore}
            <span className="mx-0.5 text-ink-3">-</span>
            {match.awayScore}
          </span>
        ) : (
          <span className="text-sm font-medium text-ink-3">{t("match.vs")}</span>
        )}
        {match.homePenaltyScore != null && match.awayPenaltyScore != null && (
          <span className="text-[10px] font-medium text-ink-3">{t("match.penalties", { home: match.homePenaltyScore, away: match.awayPenaltyScore })}</span>
        )}
      </div>

      <TeamSide team={match.awayTeam} align="left" bold={finished ? awayWon : highlightTeamId === match.awayTeam.id} dim={finished && homeWon} />

      <div className="flex items-center justify-center">
        {showFavorite ? (
          <FavoriteButton matchId={match.id} />
        ) : match.hasBroadcast && !finished ? (
          <Tv size={14} className="text-ink-3" />
        ) : null}
      </div>
    </Link>
  );
}

function TeamSide({ team, align, bold, dim }: { team: MatchSummary["homeTeam"]; align: "left" | "right"; bold: boolean; dim: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <TeamLogo team={team} size="md" />
      <span className={cn("line-clamp-2 break-words text-[13px] leading-tight sm:text-sm", bold ? "font-bold" : "font-medium", dim && "text-ink-2")}>
        {team.name}
      </span>
    </div>
  );
}

/** A card listing fixtures under a title (round, date, "upcoming", …). */
export function MatchList({
  title,
  icon,
  action,
  matches,
  showDate,
  highlightTeamId,
  empty,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  matches: MatchSummary[];
  showDate?: boolean;
  highlightTeamId?: string;
  empty?: ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      {title && (
        <header className="flex min-h-[48px] items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold">
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          {action}
        </header>
      )}
      {matches.length === 0 && empty ? (
        empty
      ) : (
        <div className="divide-y divide-line">
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} showDate={showDate} highlightTeamId={highlightTeamId} />
          ))}
        </div>
      )}
    </section>
  );
}
