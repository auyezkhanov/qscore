import { useParams } from "react-router-dom";
import { usePlayer, usePlayerCareer, usePlayerStats } from "@/shared/api/queries";
import type { PlayerDetail } from "@/shared/api/types";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { cn } from "@/shared/lib/utils";
import { Page } from "@/shared/ui/Container";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { NotFoundState, QueryState } from "@/shared/ui/States";
import { CareerCard } from "@/features/player/CareerCard";
import { ComparisonRadar } from "@/features/player/ComparisonRadar";
import { DetailedStats } from "@/features/player/DetailedStats";
import { MarketValueCard } from "@/features/player/MarketValueCard";
import { MatchLog } from "@/features/player/MatchLog";
import { PlayerHero, PlayerHeroSkeleton } from "@/features/player/PlayerHero";
import { SeasonCharts, seasonChartViews } from "@/features/player/SeasonCharts";
import { SeasonSummary } from "@/features/player/SeasonSummary";

export default function PlayerPage() {
  const { slug = "" } = useParams();
  const player = usePlayer(slug);
  useDocumentTitle(player.data?.name);

  return (
    <Page>
      <QueryState
        query={player}
        notFound={<NotFoundState titleKey="notFound.player" />}
        loading={
          <>
            <PlayerHeroSkeleton />
            <SkeletonCard rows={1} rowClassName="h-16" />
          </>
        }
      >
        {(data) => <PlayerContent player={data} />}
      </QueryState>
    </Page>
  );
}

function PlayerContent({ player }: { player: PlayerDetail }) {
  const stats = usePlayerStats(player.slug);
  // Slow and optional (fetched live from the source): never blocks the page.
  const career = usePlayerCareer(player.slug);
  const isGk = player.position === "GK";

  return (
    <>
      <PlayerHero player={player} bio={career.data?.bio} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <SeasonSummary player={player} />
          <QueryState
            query={stats}
            errorClassName="card"
            loading={
              <div className="grid gap-4 md:grid-cols-2">
                <SkeletonCard rows={1} rowClassName="h-48" />
                <SkeletonCard rows={1} rowClassName="h-48" />
              </div>
            }
          >
            {(s) => (
              <>
                <div className={cn("grid gap-4", seasonChartViews(s.matchLog, isGk).length > 0 && "md:grid-cols-2")}>
                  <SeasonCharts log={s.matchLog} isGk={isGk} average={player.rating?.average ?? null} />
                  <ComparisonRadar comparison={s.positionComparison} position={player.position} />
                </div>
                <MatchLog log={s.matchLog} isGk={isGk} />
              </>
            )}
          </QueryState>
          <CareerCard query={career} />
        </div>
        <aside className="min-w-0 space-y-4">
          <MarketValueCard player={player} />
          <DetailedStats player={player} />
        </aside>
      </div>
    </>
  );
}
