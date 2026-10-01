import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Banknote, MapPin } from "lucide-react";
import type { TeamDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatMoney, signed } from "@/shared/lib/utils";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { Skeleton } from "@/shared/ui/Skeleton";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { CalendarButton } from "@/features/league/CalendarButton";
import { FollowButton } from "@/features/push/FollowButton";
import { ColorWash, StatTile } from "./StatTile";

/** Club header: crest, name, location, league and the season summary. `children` is the tab bar. */
export function TeamHero({ team, children }: { team: TeamDetail; children?: ReactNode }) {
  const { t, locale } = useI18n();
  const place = [team.city, team.stadium?.name].filter(Boolean).join(" · ");
  const s = team.standing;

  return (
    <section className="card relative overflow-hidden">
      <ColorWash color={team.color} />
      <div className="relative flex flex-col gap-5 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <TeamLogo team={team} size="2xl" className="drop-shadow-sm" />
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{team.name}</h1>
              {place && (
                <p className="flex items-center gap-1.5 text-sm text-ink-2">
                  <MapPin size={14} className="shrink-0 text-ink-3" />
                  <span className="truncate">{place}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {team.league && (
                  <Link
                    to={`/league/${team.league.slug}`}
                    className="inline-flex max-w-full items-center gap-2 rounded-full bg-surface-2/80 py-1 pl-1 pr-3 text-[13px] font-semibold transition-colors hover:bg-surface-3"
                  >
                    <LeagueBadge slug={team.league.slug} size="sm" />
                    <span className="truncate">{team.league.name}</span>
                  </Link>
                )}
                {team.squadValue != null && (
                  <span
                    title={t("transfers.tmSource")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-[13px] font-semibold text-brand-700 dark:text-brand-200"
                  >
                    <Banknote size={14} className="text-brand" />
                    {t("value.squad")}: <span className="tnum">{formatMoney(team.squadValue, locale)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FollowButton kind="team" id={team.id} />
            <CalendarButton kind="teams" slug={team.slug} align="left" />
          </div>
        </div>

        {s && (
          <div className="grid grid-cols-4 gap-2 md:w-[380px] md:shrink-0">
            <StatTile value={s.position} label={t("team.position")} />
            <StatTile value={s.played} label={t("team.played")} />
            <StatTile value={s.points} label={t("team.points")} />
            <StatTile value={signed(s.goalsFor - s.goalsAgainst)} label={t("team.goalDiff")} />
          </div>
        )}
      </div>
      {children && <div className="relative -mb-px border-t border-line">{children}</div>}
    </section>
  );
}

export function TeamHeroSkeleton() {
  return (
    <div className="card p-4 sm:p-6" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[62px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
