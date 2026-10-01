import type { ReactNode } from "react";
import { Archive } from "lucide-react";
import type { League } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { Skeleton } from "@/shared/ui/Skeleton";

/**
 * League identity card; `children` (the tab bar) is docked to its bottom edge.
 * `controls` (season picker, calendar) sit on the right, or under the name on phones.
 * `archived` hides the live round progress while a past season is shown.
 */
export function LeagueHeader({
  league,
  controls,
  archived = false,
  children,
}: {
  league: League;
  controls?: ReactNode;
  archived?: boolean;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const season = league.season;
  // The season itself is shown by the picker in `controls`.
  const meta = [league.country, !controls && season && t("league.season", { year: season.year })].filter((x): x is string => !!x);
  const progress =
    !archived && season?.currentRound != null && season.totalRounds != null && season.totalRounds > 0
      ? { round: season.currentRound, total: season.totalRounds, label: t("league.roundOf", { round: season.currentRound, total: season.totalRounds }) }
      : null;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-5 sm:flex-nowrap sm:px-6 sm:py-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface-2 sm:h-20 sm:w-20">
          <LeagueBadge slug={league.slug} size="lg" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{league.name}</h1>
          {(meta.length > 0 || archived) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-ink-3">
              {meta.map((m, i) => (
                <span key={m} className="inline-flex items-center gap-2">
                  {i > 0 && <span aria-hidden>·</span>}
                  {m}
                </span>
              ))}
              {archived && (
                <span className="inline-flex items-center gap-1 rounded-full bg-draw/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-2">
                  <Archive size={11} aria-hidden />
                  {t("league.archive")}
                </span>
              )}
            </p>
          )}
          {progress && (
            <div className="mt-2 flex items-center gap-2.5">
              <div
                className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-3 sm:w-40"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.round}
                aria-label={progress.label}
              >
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (progress.round / progress.total) * 100)}%` }} />
              </div>
              <span className="text-xs font-semibold text-ink-2 tnum">{progress.label}</span>
            </div>
          )}
        </div>
        {controls && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{controls}</div>}
      </div>
      {children && <div className="border-t border-line">{children}</div>}
    </section>
  );
}

export function LeagueHeaderSkeleton() {
  return (
    <div className="card flex items-center gap-4 px-4 py-5 sm:px-6 sm:py-6" aria-busy="true">
      <Skeleton className="h-16 w-16 rounded-2xl sm:h-20 sm:w-20" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-60" />
      </div>
    </div>
  );
}
