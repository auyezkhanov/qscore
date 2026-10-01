import { Trophy } from "lucide-react";
import type { League } from "@/shared/api/types";
import { useLeagues } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { Card, CardHeader, CardLink } from "@/shared/ui/Card";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { SkeletonRows } from "@/shared/ui/Skeleton";
import { QueryState } from "@/shared/ui/States";

export const byTier = (a: League, b: League) => a.tier - b.tier || a.name.localeCompare(b.name);

/** Muted placeholder for competitions we don't cover yet. */
export function ComingSoonCup({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("flex items-center gap-3 text-sm text-ink-3", className)}>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2">
        <Trophy size={14} />
      </span>
      {t("home.comingSoonCup")}
    </div>
  );
}

/** Sidebar league list that doubles as the feed's league filter (click again to clear). */
export function LeaguesCard({
  active,
  onSelect,
  counts,
}: {
  active: string | null;
  onSelect: (slug: string | null) => void;
  /** Matches per league on the selected day. */
  counts: Record<string, number>;
}) {
  const { t } = useI18n();
  const leagues = useLeagues();

  return (
    <Card>
      <CardHeader title={t("sidebar.leagues")} icon={<Trophy size={17} />} action={<CardLink to="/leagues">{t("sidebar.all")}</CardLink>} />
      <QueryState query={leagues} loading={<SkeletonRows rows={2} rowClassName="h-9" />}>
        {(list) => (
          <div className="p-1.5">
            <ul>
              {[...list].sort(byTier).map((l) => {
                const selected = active === l.slug;
                return (
                  <li key={l.slug}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(selected ? null : l.slug)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition-colors",
                        selected ? "bg-brand/10 text-brand" : "text-ink hover:bg-surface-2",
                      )}
                    >
                      <LeagueBadge slug={l.slug} size="md" />
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      {!!counts[l.slug] && <span className={cn("text-xs tnum", selected ? "text-brand" : "text-ink-3")}>{counts[l.slug]}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <ComingSoonCup className="px-2.5 py-2" />
          </div>
        )}
      </QueryState>
    </Card>
  );
}
