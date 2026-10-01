import { useParams } from "react-router-dom";
import type { MatchDetail } from "@/shared/api/types";
import { useMatch } from "@/shared/api/queries";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Page } from "@/shared/ui/Container";
import { NotFoundState, QueryState } from "@/shared/ui/States";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { Tabs, useTabParam, type TabItem } from "@/shared/ui/Tabs";
import { MatchBroadcast } from "@/features/match/MatchBroadcast";
import { MatchHeader, MatchHeaderSkeleton } from "@/features/match/MatchHeader";
import { MatchHeadToHead } from "@/features/match/MatchHeadToHead";
import { MatchLineups } from "@/features/match/MatchLineups";
import { MatchOverview } from "@/features/match/MatchOverview";
import { MatchStats } from "@/features/match/MatchStats";
import { MatchTable } from "@/features/match/MatchTable";

const ALL_TABS = ["overview", "broadcast", "lineups", "stats", "table", "h2h"] as const;
const NO_BROADCAST_TABS = ALL_TABS.filter((k) => k !== "broadcast");
type TabKey = (typeof ALL_TABS)[number];

export default function MatchPage() {
  const { id = "" } = useParams();
  const query = useMatch(id);
  const m = query.data;
  useDocumentTitle(m ? `${m.homeTeam.name} – ${m.awayTeam.name}` : null);

  return (
    <Page>
      <div className="mx-auto max-w-[880px] space-y-4">
        <QueryState
          query={query}
          notFound={<NotFoundState titleKey="notFound.match" />}
          errorClassName="card"
          loading={
            <>
              <MatchHeaderSkeleton />
              <SkeletonCard rows={6} rowClassName="h-10" />
            </>
          }
        >
          {(match) => <MatchView match={match} />}
        </QueryState>
      </div>
    </Page>
  );
}

function MatchView({ match }: { match: MatchDetail }) {
  const { t } = useI18n();
  const [tab, setTab] = useTabParam<TabKey>(match.youtubeUrl ? ALL_TABS : NO_BROADCAST_TABS, "overview");

  const labels: Record<TabKey, string> = {
    overview: t("tabs.overview"),
    broadcast: t("tabs.broadcast"),
    lineups: t("tabs.lineups"),
    stats: t("tabs.stats"),
    table: t("tabs.table"),
    h2h: t("tabs.h2h"),
  };
  const tabs: TabItem<TabKey>[] = ALL_TABS.map((key) => ({ key, label: labels[key], hidden: key === "broadcast" && !match.youtubeUrl }));

  return (
    <>
      <MatchHeader match={match} onWatch={() => setTab("broadcast")}>
        <Tabs tabs={tabs} active={tab} onChange={setTab} className="-mb-px" />
      </MatchHeader>

      <div role="tabpanel" aria-label={labels[tab]} className="animate-fade-in" key={tab}>
        {tab === "overview" ? (
          <MatchOverview match={match} />
        ) : tab === "table" ? (
          <MatchTable match={match} />
        ) : tab === "h2h" ? (
          <MatchHeadToHead match={match} />
        ) : (
          <section className="card overflow-hidden">
            {tab === "broadcast" && match.youtubeUrl && (
              <MatchBroadcast url={match.youtubeUrl} title={`${match.homeTeam.name} – ${match.awayTeam.name}`} />
            )}
            {tab === "lineups" && <MatchLineups match={match} />}
            {tab === "stats" && <MatchStats match={match} />}
          </section>
        )}
      </div>
    </>
  );
}
