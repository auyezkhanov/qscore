import { useState } from "react";
import { useLeagues, useMatchesOnDay } from "@/shared/api/queries";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { Container } from "@/shared/ui/Container";
import { isLive } from "@/features/matches/MatchStatus";
import { DateNav } from "@/features/home/DateNav";
import { LeaguesCard, byTier } from "@/features/home/LeaguesCard";
import { MatchFeed } from "@/features/home/MatchFeed";
import { MatchFilters, NO_FILTERS, type FeedFilters } from "@/features/home/MatchFilters";
import { NewsCard } from "@/features/home/NewsCard";
import { StandingsCard } from "@/features/home/StandingsCard";
import { TopScorersCard } from "@/features/home/TopScorersCard";
import { useHomeParams } from "@/features/home/useHomeParams";

// Sidebars stick under the 64px header and scroll on their own when taller than the viewport.
const STICKY = "lg:sticky lg:top-20 lg:-mx-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:px-1 lg:pb-1 scrollbar-none";

export default function HomePage() {
  useDocumentTitle(null);
  const { day, setDay, league, setLeague } = useHomeParams();
  const [filters, setFilters] = useState<FeedFilters>(NO_FILTERS);
  const matches = useMatchesOnDay(day);
  const leagues = useLeagues();

  const current = matches.isPlaceholderData ? [] : (matches.data ?? []);
  const liveCount = current.filter(isLive).length;
  const counts: Record<string, number> = {};
  for (const m of current) counts[m.league.slug] = (counts[m.league.slug] ?? 0) + 1;

  const resetFilters = () => {
    setFilters(NO_FILTERS);
    setLeague(null);
  };

  return (
    <Container className="py-4 sm:py-6">
      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_340px] xl:gap-6">
        <aside className="hidden lg:block">
          <div className={`${STICKY} space-y-4`}>
            <LeaguesCard active={league} onSelect={setLeague} counts={counts} />
            <NewsCard />
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <DateNav day={day} onChange={setDay} loading={matches.isFetching && matches.isPlaceholderData} />
          <MatchFilters
            filters={filters}
            onChange={setFilters}
            liveCount={liveCount}
            leagues={[...(leagues.data ?? [])].sort(byTier)}
            league={league}
            onLeagueChange={setLeague}
          />
          <MatchFeed query={matches} day={day} filters={filters} league={league} onResetFilters={resetFilters} onJumpToDay={setDay} />
        </div>

        <aside className="min-w-0">
          <div className={`${STICKY} grid items-start gap-4 md:grid-cols-2 lg:grid-cols-1`}>
            <TopScorersCard slug="kpl" />
            <StandingsCard slug="kpl" />
          </div>
        </aside>
      </div>
    </Container>
  );
}
