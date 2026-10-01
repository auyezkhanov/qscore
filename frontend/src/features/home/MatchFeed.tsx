import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { FilterX } from "lucide-react";
import type { LeagueRef, MatchSummary } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { useFavorites } from "@/features/favorites/FavoritesProvider";
import { isLive } from "@/features/matches/MatchStatus";
import { EmptyDay } from "./EmptyDay";
import { LeagueGroup } from "./LeagueGroup";
import type { FeedFilters } from "./MatchFilters";

type Group = { league: LeagueRef; matches: MatchSummary[]; firstKickoff: number };

const kickoffTime = (m: MatchSummary) => new Date(m.kickoff).getTime();

/** Groups fixtures by league: by tier, or by each league's earliest kick-off. */
function groupByLeague(matches: MatchSummary[], byTime: boolean): Group[] {
  const groups = new Map<string, Group>();
  for (const m of [...matches].sort((a, b) => kickoffTime(a) - kickoffTime(b))) {
    const g = groups.get(m.league.slug);
    if (g) g.matches.push(m);
    else groups.set(m.league.slug, { league: m.league, matches: [m], firstKickoff: kickoffTime(m) });
  }
  return [...groups.values()].sort((a, b) =>
    byTime ? a.firstKickoff - b.firstKickoff || a.league.tier - b.league.tier : a.league.tier - b.league.tier || a.league.name.localeCompare(b.league.name),
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonCard rows={4} rowClassName="h-10" />
      <SkeletonCard rows={3} rowClassName="h-10" />
    </div>
  );
}

/** The day's fixtures, filtered and grouped into collapsible league cards. */
export function MatchFeed({
  query,
  day,
  filters,
  league,
  onResetFilters,
  onJumpToDay,
}: {
  query: UseQueryResult<MatchSummary[]>;
  day: Date;
  filters: FeedFilters;
  league: string | null;
  onResetFilters: () => void;
  onJumpToDay: (d: Date) => void;
}) {
  const { t } = useI18n();
  const { isFavorite } = useFavorites();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const stale = query.isPlaceholderData;

  return (
    <QueryState query={query} loading={<FeedSkeleton />}>
      {(matches) => {
        // Previous day's data is kept while the next loads; an empty placeholder would flash "no matches".
        if (stale && matches.length === 0) return <FeedSkeleton />;
        if (matches.length === 0) return <EmptyDay day={day} onJump={onJumpToDay} />;

        const visible = matches.filter(
          (m) => (!filters.live || isLive(m)) && (!filters.favorites || isFavorite(m.id)) && (!league || m.league.slug === league),
        );
        if (visible.length === 0) {
          return (
            <section className="card">
              <EmptyState
                icon={<FilterX size={22} />}
                title={t("home.noMatchesFiltered")}
                action={
                  <Button variant="secondary" size="sm" onClick={onResetFilters}>
                    {t("home.resetFilters")}
                  </Button>
                }
              />
            </section>
          );
        }

        return (
          <div className={cn("space-y-3 transition-opacity", stale && "pointer-events-none opacity-60")} aria-busy={stale}>
            {groupByLeague(visible, filters.byTime).map((g) => (
              <LeagueGroup
                key={g.league.slug}
                league={g.league}
                matches={g.matches}
                collapsed={!!collapsed[g.league.slug]}
                onToggle={() => setCollapsed((c) => ({ ...c, [g.league.slug]: !c[g.league.slug] }))}
              />
            ))}
          </div>
        );
      }}
    </QueryState>
  );
}
