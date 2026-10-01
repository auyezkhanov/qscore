import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import type { LeaderStat, TopPlayer } from "@/shared/api/types";
import { useTopPlayers } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { SkeletonRows } from "@/shared/ui/Skeleton";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { ratingTone } from "@/shared/ui/RatingBadge";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { formatStat } from "./leaderStats";

/** Competition ranking ("1, 2, 2, 4"): tied players share a place. */
function ranks(players: TopPlayer[]): number[] {
  return players.map((p, i) => {
    let first = i;
    while (first > 0 && players[first - 1].value === p.value) first--;
    return first + 1;
  });
}

const MEDALS = ["bg-amber-400 text-black", "bg-slate-300 text-black", "bg-orange-400 text-black"];

/** One leaderboard (any LeaderStat) with a source / eligibility caption where it matters. */
export function TopPlayersTable({ slug, stat }: { slug: string; stat: LeaderStat }) {
  const { t } = useI18n();
  const query = useTopPlayers(slug, stat, 30);
  const caption = stat === "rating" ? t("leaders.ratingNote") : stat === "marketValue" ? t("transfers.tmSource") : null;
  return (
    <section className="card overflow-hidden">
      <QueryState query={query} loading={<SkeletonRows rows={10} rowClassName="h-11" />}>
        {(players) => <Table players={players} stat={stat} />}
      </QueryState>
      {caption && <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-3">{caption}</p>}
    </section>
  );
}

function Table({ players, stat }: { players: TopPlayer[]; stat: LeaderStat }) {
  const { t, locale } = useI18n();
  const list = players.filter((p) => p.value > 0);
  if (list.length === 0) return <EmptyState icon={<Users size={22} />} title={t("common.noData")} />;

  const place = ranks(list);
  const wide = stat === "marketValue" || stat === "minutesPlayed";
  const th = "py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3";

  return (
    <table className="w-full table-fixed border-collapse text-sm">
      <thead>
        <tr className="border-b border-line">
          <th className={cn(th, "w-11 pl-2 text-center sm:w-12 sm:pl-4")}>#</th>
          <th className={cn(th, "pl-1 text-left")}>{t("top.player")}</th>
          <th className={cn(th, "hidden text-left md:table-cell")}>{t("top.team")}</th>
          <th className={cn(th, "w-12 text-center sm:w-16")} title={t("leaders.matchesHint")}>
            {t("top.apps")}
          </th>
          <th className={cn(th, "pr-3 text-center text-ink sm:pr-4", wide ? "w-[5.5rem] sm:w-28" : "w-[4.5rem] sm:w-20")}>{t(`leader.${stat}` as const)}</th>
        </tr>
      </thead>
      <tbody>
        {list.map((p, i) => {
          const rank = place[i];
          const podium = rank <= 3;
          return (
            <tr key={p.id} className={cn("border-b border-line/70 last:border-0 row-hover", podium && "bg-brand/[0.04]")}>
              <td className="py-2 pl-2 text-center sm:pl-4">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tnum",
                    podium ? MEDALS[rank - 1] : "text-ink-3",
                  )}
                >
                  {rank}
                </span>
              </td>
              <td className="py-2 pl-1 pr-2">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="md" />
                  <div className="min-w-0">
                    <Link to={`/player/${p.slug}`} className="block truncate font-semibold hover:underline">
                      {p.name}
                    </Link>
                    <Link to={`/team/${p.team.slug}`} className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-3 hover:text-ink-2 md:hidden">
                      <TeamLogo team={p.team} size="xs" />
                      <span className="truncate">{p.team.name}</span>
                    </Link>
                  </div>
                </div>
              </td>
              <td className="hidden py-2 pr-2 md:table-cell">
                <Link to={`/team/${p.team.slug}`} className="flex min-w-0 items-center gap-2 text-ink-2 hover:text-ink hover:underline">
                  <TeamLogo team={p.team} size="sm" />
                  <span className="truncate">{p.team.name}</span>
                </Link>
              </td>
              <td className="py-2 text-center text-ink-2 tnum">{p.matches}</td>
              <td className="py-2 pr-3 text-center sm:pr-4">
                <Value stat={stat} value={p.value} leader={rank === 1} label={formatStat(stat, p.value, locale)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Value({ stat, value, leader, label }: { stat: LeaderStat; value: number; leader: boolean; label: string }) {
  if (stat === "rating") {
    return (
      <span
        className={cn(
          "inline-flex h-6 min-w-[2.75rem] items-center justify-center rounded-md px-1.5 text-[13px] font-extrabold leading-none tnum shadow-sm",
          ratingTone(value),
        )}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-[2.25rem] items-center justify-center whitespace-nowrap rounded-full px-2 font-extrabold tnum",
        stat === "marketValue" || stat === "minutesPlayed" ? "text-[13px]" : "text-[15px]",
        leader ? "bg-brand text-brand-fg" : "text-ink",
      )}
    >
      {label}
    </span>
  );
}
