import { useStandings } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Card, CardHeader, CardLink } from "@/shared/ui/Card";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { SkeletonRows } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { StandingsTable } from "@/features/standings/StandingsTable";

/** Compact league table for the sidebar. */
export function StandingsCard({ slug }: { slug: string }) {
  const { t } = useI18n();
  const query = useStandings(slug);

  return (
    <Card>
      <CardHeader
        title={t("sidebar.standings")}
        icon={<LeagueBadge slug={slug} size="sm" />}
        action={<CardLink to={`/league/${slug}`}>{t("sidebar.all")}</CardLink>}
      />
      <QueryState query={query} loading={<SkeletonRows rows={8} rowClassName="h-8" />}>
        {(rows) => (rows.length === 0 ? <EmptyState title={t("common.noData")} className="py-8" /> : <StandingsTable rows={rows} compact />)}
      </QueryState>
    </Card>
  );
}
