import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { LeaderStat } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { ToggleChip } from "@/shared/ui/Chip";
import { STAT_GROUPS, groupOf, isLeaderStat } from "./leaderStats";
import { TopPlayersTable } from "./TopPlayersTable";

/** Chosen leaderboard in `?stat=`; `fallback` covers old links like `?tab=assists`. */
export function useStatParam(fallback: LeaderStat): [LeaderStat, (stat: LeaderStat) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("stat");
  const stat = isLeaderStat(raw) ? raw : fallback;
  const setStat = useCallback(
    (next: LeaderStat) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("tab", "stats");
          p.set("stat", next);
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [stat, setStat];
}

/**
 * Player leaderboards: a category row (Top, Attack, Defence…) and the stats of
 * that category, then the ranked table. `hideMarketValue` drops the Transfermarkt
 * board in leagues that have no values synced.
 */
export function PlayerStatsTab({ slug, fallback, hideMarketValue }: { slug: string; fallback: LeaderStat; hideMarketValue: boolean }) {
  const { t } = useI18n();
  const [stat, setStat] = useStatParam(fallback);
  const groups = STAT_GROUPS.map((g) => ({ ...g, stats: g.stats.filter((s) => !(hideMarketValue && s === "marketValue" && stat !== s)) }));
  const activeGroup = groupOf(stat);
  const groupStats = groups.find((g) => g.key === activeGroup)?.stats ?? [];

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden" role="group" aria-label={t("leaders.pickStat")}>
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-2.5 pt-3 sm:px-4">
          {groups.map((g) => (
            <ToggleChip key={g.key} active={g.key === activeGroup} onClick={() => g.key !== activeGroup && setStat(g.stats[0])}>
              {t(`leaders.group.${g.key}` as const)}
            </ToggleChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5 sm:px-4">
          {groupStats.map((s) => {
            const active = s === stat;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => setStat(s)}
                className={cn(
                  "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold transition active:scale-95",
                  active ? "bg-brand/15 text-brand-700 dark:text-brand-200" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {t(`leader.${s}` as const)}
              </button>
            );
          })}
        </div>
      </div>

      <div key={stat} className="animate-fade-in">
        <TopPlayersTable slug={slug} stat={stat} />
      </div>
    </div>
  );
}
