import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { League } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";

/** Large league card for the Leagues page: badge, season and round progress. */
export function LeagueTile({ league }: { league: League }) {
  const { t } = useI18n();
  const season = league.season;
  const progress =
    season?.currentRound != null && season.totalRounds ? Math.min(100, Math.round((season.currentRound / season.totalRounds) * 100)) : null;

  return (
    <Link to={`/league/${league.slug}`} className="card group flex items-center gap-4 p-4 row-hover sm:p-5">
      <LeagueBadge slug={league.slug} size="lg" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-bold tracking-tight sm:text-lg">{league.name}</h2>
        <p className="truncate text-[13px] text-ink-3">
          {[league.country, season && t("league.season", { year: season.year })].filter(Boolean).join(" · ")}
        </p>
        {progress != null && season && (
          <div className="mt-2.5">
            <div className="mb-1 text-xs font-medium text-ink-2 tnum">
              {t("league.roundOf", { round: season.currentRound ?? 0, total: season.totalRounds ?? 0 })}
            </div>
            <div
              className="h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-surface-3"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={t("league.roundOf", { round: season.currentRound ?? 0, total: season.totalRounds ?? 0 })}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
      <ChevronRight size={20} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
