import { useParams } from "react-router-dom";
import { useTeam } from "@/shared/api/queries";
import type { TeamDetail } from "@/shared/api/types";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Page } from "@/shared/ui/Container";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { NotFoundState, QueryState } from "@/shared/ui/States";
import { Tabs, useTabParam, type TabItem } from "@/shared/ui/Tabs";
import { TeamHero, TeamHeroSkeleton } from "@/features/team/TeamHero";
import { TeamOverview } from "@/features/team/TeamOverview";
import { TeamMatchesTab, TeamSquadTab, TeamTableTab, TeamTransfersTab } from "@/features/team/TeamTabs";

const TAB_KEYS = ["overview", "table", "matches", "squad", "transfers"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function TeamPage() {
  const { slug = "" } = useParams();
  const team = useTeam(slug);
  useDocumentTitle(team.data?.name);

  return (
    <Page>
      <QueryState
        query={team}
        notFound={<NotFoundState titleKey="notFound.team" />}
        loading={
          <>
            <TeamHeroSkeleton />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SkeletonCard rows={2} rowClassName="h-14" />
              <SkeletonCard rows={2} rowClassName="h-14" />
              <SkeletonCard rows={2} rowClassName="h-14" className="hidden xl:block" />
            </div>
          </>
        }
      >
        {(data) => <TeamContent team={data} />}
      </QueryState>
    </Page>
  );
}

function TeamContent({ team }: { team: TeamDetail }) {
  const { t } = useI18n();
  const [tab, setTab] = useTabParam(TAB_KEYS, "overview");
  const tabs: TabItem<TabKey>[] = [
    { key: "overview", label: t("tabs.overview") },
    { key: "table", label: t("tabs.table"), hidden: !team.league },
    { key: "matches", label: t("tabs.matches") },
    { key: "squad", label: t("tabs.squad") },
    { key: "transfers", label: t("tabs.transfers") },
  ];
  const active: TabKey = tab === "table" && !team.league ? "overview" : tab;

  return (
    <>
      <TeamHero team={team}>
        <Tabs tabs={tabs} active={active} onChange={setTab} />
      </TeamHero>
      <div role="tabpanel">
        {active === "overview" && <TeamOverview team={team} />}
        {active === "table" && <TeamTableTab team={team} />}
        {active === "matches" && <TeamMatchesTab team={team} />}
        {active === "squad" && <TeamSquadTab team={team} />}
        {active === "transfers" && <TeamTransfersTab team={team} />}
      </div>
    </>
  );
}
