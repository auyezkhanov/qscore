import { Link } from "react-router-dom";
import type { StandingRow } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn, signed } from "@/shared/lib/utils";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { ZONES, ZoneLegend, zonesIn } from "./zones";
import { FormBadge } from "@/shared/ui/FormBadge";

/**
 * League table. `compact` drops W/D/L and form for narrow sidebars;
 * `highlightSlug` marks one club's row (e.g. on its own team page).
 */
export function StandingsTable({ rows, compact = false, highlightSlug }: { rows: StandingRow[]; compact?: boolean; highlightSlug?: string }) {
  const { t } = useI18n();
  const zones = zonesIn(rows);
  const th = "py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3";

  return (
    <div>
      <div className={compact ? "" : "overflow-x-auto"}>
        <table className={cn("w-full border-collapse text-sm", !compact && "sm:min-w-[520px]")}>
          <thead>
            <tr className="border-b border-line">
              <th className={cn(th, "w-9 pl-3 text-left")}>#</th>
              <th className={cn(th, "text-left")}>{t("standings.team")}</th>
              <th className={cn(th, "w-8 text-center")}>{t("standings.played")}</th>
              {!compact && (
                <>
                  <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.wins")}</th>
                  <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.draws")}</th>
                  <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.losses")}</th>
                  <th className={cn(th, "hidden w-16 text-center sm:table-cell")}>{t("standings.goals")}</th>
                </>
              )}
              <th className={cn(th, "w-10 text-center")}>{t("standings.goalDiff")}</th>
              <th className={cn(th, "w-10 text-center", compact && "pr-3")}>{t("standings.points")}</th>
              {!compact && <th className={cn(th, "hidden pr-4 text-right md:table-cell")}>{t("standings.form")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const zone = r.zone ? ZONES[r.zone] : undefined;
              const highlighted = r.team.slug === highlightSlug;
              return (
                <tr key={r.team.id} className={cn("border-b border-line/70 last:border-0 row-hover", highlighted && "bg-brand/[0.08] hover:bg-brand/[0.12]")}>
                  <td className="relative py-2 pl-3">
                    {zone && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: zone.color }} />}
                    <span className="inline-flex h-6 w-6 items-center justify-center text-[13px] font-semibold text-ink-2 tnum">{r.position}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <Link to={`/team/${r.team.slug}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                      <TeamLogo team={r.team} size="sm" />
                      <span className={cn("truncate", highlighted ? "font-bold" : "font-medium")}>{r.team.name}</span>
                    </Link>
                  </td>
                  <td className="py-2 text-center text-ink-2 tnum">{r.played}</td>
                  {!compact && (
                    <>
                      <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.wins}</td>
                      <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.draws}</td>
                      <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.losses}</td>
                      <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">
                        {r.goalsFor}:{r.goalsAgainst}
                      </td>
                    </>
                  )}
                  <td className="py-2 text-center text-ink-2 tnum">{signed(r.goalDiff)}</td>
                  <td className={cn("py-2 text-center font-bold tnum", compact && "pr-3")}>{r.points}</td>
                  {!compact && (
                    <td className="hidden py-2 pr-4 md:table-cell">
                      <div className="flex justify-end gap-1">
                        {r.form.map((f, i) => (
                          <FormBadge key={i} result={f} />
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!compact && <ZoneLegend zones={zones} />}
    </div>
  );
}
