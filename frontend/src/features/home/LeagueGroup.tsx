import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { LeagueRef, MatchSummary } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { IconButton } from "@/shared/ui/Button";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { MatchRow } from "@/features/matches/MatchRow";
import { LiveDot, isLive } from "@/features/matches/MatchStatus";

/** A collapsible card with one league's fixtures of the day. */
export function LeagueGroup({
  league,
  matches,
  collapsed,
  onToggle,
}: {
  league: LeagueRef;
  matches: MatchSummary[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const liveCount = matches.filter(isLive).length;
  const rounds = [...new Set(matches.map((m) => m.round))];
  const bodyId = `league-group-${league.slug}`;

  return (
    <section className="card overflow-hidden">
      <header className={cn("flex min-h-[52px] items-center gap-2.5 py-1.5 pl-3 pr-1.5 sm:pl-4", !collapsed && "border-b border-line")}>
        <LeagueBadge slug={league.slug} size="md" />
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <Link to={`/league/${league.slug}`} className="truncate text-sm font-bold hover:underline">
            {league.name}
          </Link>
          {rounds.length === 1 && <span className="shrink-0 text-xs font-medium text-ink-3">{t("match.roundShort", { round: rounds[0] })}</span>}
        </div>
        {liveCount > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[11px] font-bold text-live tnum">
            <LiveDot />
            {liveCount}
          </span>
        )}
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2 tnum">{matches.length}</span>
        <IconButton size="sm" aria-expanded={!collapsed} aria-controls={bodyId} aria-label={t("home.toggleGroup", { league: league.name })} onClick={onToggle}>
          <ChevronDown size={18} className={cn("transition-transform", collapsed && "-rotate-90")} />
        </IconButton>
      </header>
      {!collapsed && (
        <div id={bodyId} className="divide-y divide-line">
          {matches.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      )}
    </section>
  );
}
