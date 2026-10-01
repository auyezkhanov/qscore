import { useParams } from "react-router-dom";
import { ListOrdered } from "lucide-react";
import type { LeaderStat, League } from "@/shared/api/types";
import { useLeague, useStandings, useTopPlayers } from "@/shared/api/queries";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Page } from "@/shared/ui/Container";
import { EmptyState, NotFoundState, QueryState } from "@/shared/ui/States";
import { SkeletonCard, SkeletonRows } from "@/shared/ui/Skeleton";
import { Tabs, useTabParam, type TabItem } from "@/shared/ui/Tabs";
import { LeagueHeader, LeagueHeaderSkeleton } from "@/features/league/LeagueHeader";
import { LeagueRoundMatches } from "@/features/league/LeagueRoundMatches";
import { CalendarButton } from "@/features/league/CalendarButton";
import { PlayerStatsTab } from "@/features/league/PlayerStatsTab";
import { ArchivedRounds, ArchivedStandings } from "@/features/league/SeasonArchive";
import { SeasonPicker, useSeasonParam } from "@/features/league/SeasonPicker";
import { TeamStatsTab } from "@/features/league/TeamStatsTab";
import { StandingsTable } from "@/features/standings/StandingsTable";

const VISIBLE_TABS = ["table", "matches", "stats", "teams"] as const;
type VisibleTab = (typeof VISIBLE_TABS)[number];
const LEGACY_TABS = { scorers: "goals", assists: "assists", value: "marketValue" } as const satisfies Record<string, LeaderStat>;
type LegacyTab = keyof typeof LEGACY_TABS;
const TABS = [...VISIBLE_TABS, "scorers", "assists", "value"] as const;
type TabKey = (typeof TABS)[number];
const ARCHIVE_TABS: readonly VisibleTab[] = ["table", "matches"];

export default function LeaguePage() {
  const { slug = "" } = useParams();
  const query = useLeague(slug);
  useDocumentTitle(query.data?.name);

  return (
    <Page>
      <div className="mx-auto max-w-[960px] space-y-4">
        <QueryState
          query={query}
          notFound={<NotFoundState titleKey="notFound.league" />}
          errorClassName="card"
          loading={
            <>
              <LeagueHeaderSkeleton />
              <SkeletonCard rows={10} rowClassName="h-9" />
            </>
          }
        >
          {(league) => <LeagueView league={league} />}
        </QueryState>
      </div>
    </Page>
  );
}

function LeagueView({ league }: { league: League }) {
  const { t } = useI18n();
  const [tab, setTab] = useTabParam<TabKey>(TABS, "table");
  const [archivedYear, setSeason] = useSeasonParam(league.season?.year ?? null);
  const labels: Record<VisibleTab, string> = {
    table: t("tabs.table"),
    matches: t("tabs.matches"),
    stats: t("tabs.playerStats"),
    teams: t("tabs.teamStats"),
  };
  // Market values exist only where Transfermarkt data is synced (currently the Premier League).
  const hasValues = (useTopPlayers(league.slug, "marketValue", 1).data?.length ?? 0) > 0;

  // Old links (?tab=scorers|assists|value) open the matching leaderboard.
  const legacyStat: LeaderStat | undefined = tab in LEGACY_TABS ? LEGACY_TABS[tab as LegacyTab] : undefined;
  const wanted: VisibleTab = legacyStat ? "stats" : (tab as VisibleTab);
  // Leaders and team stats are current-season only.
  const active: VisibleTab = archivedYear != null && !ARCHIVE_TABS.includes(wanted) ? "table" : wanted;
  const tabs: TabItem<VisibleTab>[] = VISIBLE_TABS.map((key) => ({ key, label: labels[key], hidden: archivedYear != null && !ARCHIVE_TABS.includes(key) }));

  return (
    <>
      <LeagueHeader
        league={league}
        archived={archivedYear != null}
        controls={
          <>
            <SeasonPicker slug={league.slug} value={archivedYear ?? league.season?.year ?? null} onChange={setSeason} />
            <CalendarButton kind="leagues" slug={league.slug} />
          </>
        }
      >
        <Tabs tabs={tabs} active={active} onChange={setTab} className="-mb-px" />
      </LeagueHeader>

      <div role="tabpanel" aria-label={labels[active]} className="animate-fade-in" key={active + String(archivedYear ?? "")}>
        {archivedYear != null ? (
          <>
            {active === "table" && <ArchivedStandings slug={league.slug} year={archivedYear} />}
            {active === "matches" && <ArchivedRounds slug={league.slug} year={archivedYear} />}
          </>
        ) : (
          <>
            {active === "table" && <Standings slug={league.slug} />}
            {active === "matches" && <LeagueRoundMatches slug={league.slug} />}
            {active === "stats" && <PlayerStatsTab slug={league.slug} fallback={legacyStat ?? "goals"} hideMarketValue={!hasValues} />}
            {active === "teams" && <TeamStatsTab slug={league.slug} />}
          </>
        )}
      </div>
    </>
  );
}

function Standings({ slug }: { slug: string }) {
  const { t } = useI18n();
  const query = useStandings(slug);
  return (
    <section className="card overflow-hidden">
      <QueryState query={query} loading={<SkeletonRows rows={12} rowClassName="h-9" />}>
        {(rows) => (rows.length === 0 ? <EmptyState icon={<ListOrdered size={22} />} title={t("common.noData")} /> : <StandingsTable rows={rows} />)}
      </QueryState>
    </section>
  );
}
