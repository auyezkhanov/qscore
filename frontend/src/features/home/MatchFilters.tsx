import { Clock, Radio, Star } from "lucide-react";
import type { League } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { ToggleChip } from "@/shared/ui/Chip";
import { LiveDot } from "@/features/matches/MatchStatus";

export type FeedFilters = { live: boolean; favorites: boolean; byTime: boolean };
export const NO_FILTERS: FeedFilters = { live: false, favorites: false, byTime: false };

/**
 * Filter chips above the feed. League chips are shown only below `lg`;
 * on desktop the left sidebar's league list plays that role.
 */
export function MatchFilters({
  filters,
  onChange,
  liveCount,
  leagues,
  league,
  onLeagueChange,
}: {
  filters: FeedFilters;
  onChange: (f: FeedFilters) => void;
  liveCount: number;
  leagues: League[];
  league: string | null;
  onLeagueChange: (slug: string | null) => void;
}) {
  const { t } = useI18n();
  const toggle = (key: keyof FeedFilters) => onChange({ ...filters, [key]: !filters[key] });

  return (
    <div role="toolbar" aria-label={t("home.filters")} className="scrollbar-none -mx-3 flex items-center gap-2 overflow-x-auto px-3 py-1 sm:mx-0 sm:px-0.5">
      <ToggleChip active={filters.live} onClick={() => toggle("live")}>
        {liveCount > 0 ? <LiveDot className="mx-0.5" /> : <Radio size={14} />}
        {t("filter.live")}
        {liveCount > 0 && (
          <span className={cn("rounded-full px-1.5 text-[11px] font-bold tnum", filters.live ? "bg-live text-white" : "bg-live/10 text-live")}>{liveCount}</span>
        )}
      </ToggleChip>
      <ToggleChip active={filters.favorites} onClick={() => toggle("favorites")}>
        <Star size={14} className={cn(filters.favorites && "fill-amber-400 text-amber-400")} />
        {t("filter.favorites")}
      </ToggleChip>
      <ToggleChip active={filters.byTime} onClick={() => toggle("byTime")}>
        <Clock size={14} />
        {t("filter.byTime")}
      </ToggleChip>

      {leagues.length > 0 && (
        <>
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line lg:hidden" />
          {leagues.map((l) => (
            <ToggleChip key={l.slug} active={league === l.slug} onClick={() => onLeagueChange(league === l.slug ? null : l.slug)} className="pl-1.5 lg:hidden">
              <LeagueBadge slug={l.slug} size="sm" />
              {l.name}
            </ToggleChip>
          ))}
        </>
      )}
    </div>
  );
}
