import { Link } from "react-router-dom";
import { useTopPlayers } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { Card, CardHeader, CardLink } from "@/shared/ui/Card";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { SkeletonRows } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";

/** Top five scorers of a league. */
export function TopScorersCard({ slug }: { slug: string }) {
  const { t } = useI18n();
  const query = useTopPlayers(slug, "goals", 5);

  return (
    <Card>
      <CardHeader
        title={t("sidebar.topScorers")}
        icon={<LeagueBadge slug={slug} size="sm" />}
        action={<CardLink to={`/league/${slug}?tab=scorers`}>{t("sidebar.all")}</CardLink>}
      />
      <QueryState query={query} loading={<SkeletonRows rows={5} rowClassName="h-10" />}>
        {(players) =>
          players.length === 0 ? (
            <EmptyState title={t("common.noData")} className="py-8" />
          ) : (
            <ol className="py-1">
              {players.map((p, i) => (
                <li key={p.id}>
                  <Link to={`/player/${p.slug}`} className="flex items-center gap-3 px-4 py-2 row-hover">
                    <span className={cn("w-4 shrink-0 text-center text-[13px] font-bold tnum", i === 0 ? "text-brand" : "text-ink-3")}>{i + 1}</span>
                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
                        <TeamLogo team={p.team} size="xs" />
                        <span className="truncate">{p.team.name}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-[15px] font-bold tnum" aria-label={`${t("top.goals")}: ${p.goals}`}>
                      {p.goals}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )
        }
      </QueryState>
    </Card>
  );
}
