import { Link } from "react-router-dom";
import { ListOrdered } from "lucide-react";
import type { MatchDetail, StandingRow } from "@/shared/api/types";
import { useStandings } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn, signed } from "@/shared/lib/utils";
import { CardHeader, CardLink } from "@/shared/ui/Card";
import { FormBadge } from "@/shared/ui/FormBadge";
import { SkeletonCard } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { ZONES, ZoneLegend, zonesIn } from "@/features/standings/zones";
import { TeamLogo } from "@/shared/ui/TeamLogo";

/**
 * League table for the match page. A small variant of StandingsTable that marks BOTH clubs of
 * the match (StandingsTable highlights a single one) with a tinted row and an H / A tag.
 */
export function MatchTable({ match }: { match: MatchDetail }) {
  const { t } = useI18n();
  const query = useStandings(match.league.slug);

  return (
    <QueryState query={query} loading={<SkeletonCard rows={10} rowClassName="h-8" />} errorClassName="card">
      {(rows) => (
        <section className="card overflow-hidden">
          <CardHeader title={match.league.name} icon={<ListOrdered size={16} />} action={<CardLink to={`/league/${match.league.slug}`}>{t("tabs.table")}</CardLink>} />
          {rows.length === 0 ? <EmptyState icon={<ListOrdered size={22} />} title={t("common.noData")} /> : <Table rows={rows} match={match} />}
        </section>
      )}
    </QueryState>
  );
}

function Table({ rows, match }: { rows: StandingRow[]; match: MatchDetail }) {
  const { t } = useI18n();
  const sideOf = (teamId: string) => (teamId === match.homeTeam.id ? "home" : teamId === match.awayTeam.id ? "away" : null);
  const zones = zonesIn(rows);
  const th = "py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3";

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className={cn(th, "w-9 pl-3 text-left")}>#</th>
            <th className={cn(th, "text-left")}>{t("standings.team")}</th>
            <th className={cn(th, "w-8 text-center")}>{t("standings.played")}</th>
            <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.wins")}</th>
            <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.draws")}</th>
            <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.losses")}</th>
            <th className={cn(th, "hidden w-16 text-center sm:table-cell")}>{t("standings.goals")}</th>
            <th className={cn(th, "w-10 text-center")}>{t("standings.goalDiff")}</th>
            <th className={cn(th, "w-10 pr-3 text-center md:pr-0")}>{t("standings.points")}</th>
            <th className={cn(th, "hidden pr-4 text-right md:table-cell")}>{t("standings.form")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const zone = r.zone ? ZONES[r.zone] : undefined;
            const side = sideOf(r.team.id);
            return (
              <tr key={r.team.id} className={cn("border-b border-line/70 last:border-0 row-hover", side && "bg-brand/[0.08] hover:bg-brand/[0.12]")}>
                <td className="relative py-2 pl-3">
                  {zone && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: zone.color }} title={t(zone.label)} />}
                  <span className="inline-flex h-6 w-6 items-center justify-center text-[13px] font-semibold text-ink-2 tnum">{r.position}</span>
                </td>
                <td className="py-2 pr-2">
                  <Link to={`/team/${r.team.slug}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                    <TeamLogo team={r.team} size="sm" />
                    <span className={cn("truncate", side ? "font-bold" : "font-medium")}>{r.team.name}</span>
                    {side && (
                      <span className="shrink-0 rounded bg-brand px-1 text-[10px] font-bold leading-4 text-brand-fg" title={t(side === "home" ? "preview.home" : "preview.away")}>
                        {t(side === "home" ? "preview.homeTag" : "preview.awayTag")}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="py-2 text-center text-ink-2 tnum">{r.played}</td>
                <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.wins}</td>
                <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.draws}</td>
                <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.losses}</td>
                <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">
                  {r.goalsFor}:{r.goalsAgainst}
                </td>
                <td className="py-2 text-center text-ink-2 tnum">{signed(r.goalDiff)}</td>
                <td className="py-2 pr-3 text-center font-bold tnum md:pr-0">{r.points}</td>
                <td className="hidden py-2 pr-4 md:table-cell">
                  <div className="flex justify-end gap-1">
                    {r.form.map((f, i) => (
                      <FormBadge key={i} result={f} />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ZoneLegend zones={zones} />
    </div>
  );
}
