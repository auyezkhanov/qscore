import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { History } from "lucide-react";
import type { PlayerCareer } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn, formatNumber } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/ui/Card";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { SkeletonRows } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { BookingCard } from "./icons";

// The source sometimes omits counters (e.g. goals for goalkeepers) despite the DTO type, so render defensively.
type Season = PlayerCareer["career"][number];

/** Season-by-season history. The request is slow and may fail, so it degrades to a note. */
export function CareerCard({ query }: { query: UseQueryResult<PlayerCareer> }) {
  const { t } = useI18n();
  let body: ReactNode;
  if (query.data) {
    body = query.data.career.length ? <CareerTable seasons={query.data.career} /> : <EmptyState title={t("common.noData")} className="py-8" />;
  } else if (query.isError) {
    body = <p className="px-4 py-6 text-center text-sm text-ink-3 sm:px-5">{t("player.careerUnavailable")}</p>;
  } else {
    body = <SkeletonRows rows={3} rowClassName="h-9" />;
  }
  return (
    <Card>
      <CardHeader title={t("player.career")} icon={<History size={16} />} />
      {body}
    </Card>
  );
}

function CareerTable({ seasons }: { seasons: Season[] }) {
  const { t, locale } = useI18n();
  const rows = [...seasons].sort((a, b) => b.year - a.year);
  const total = rows.reduce(
    (acc, s) => ({
      appearances: acc.appearances + (s.appearances ?? 0),
      goals: acc.goals + (s.goals ?? 0),
      assists: acc.assists + (s.assists ?? 0),
      minutes: acc.minutes + (s.minutesPlayed ?? 0),
      yellow: acc.yellow + (s.yellowCards ?? 0),
      red: acc.red + (s.redCards ?? 0),
    }),
    { appearances: 0, goals: 0, assists: 0, minutes: 0, yellow: 0, red: 0 },
  );
  const th = "py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3";
  const td = "py-2.5 text-center text-[13px] text-ink-2 tnum";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[340px] border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th className={cn(th, "w-14 pl-4 text-left sm:pl-5")}>{t("career.season")}</th>
            <th className={cn(th, "text-left")}>{t("career.club")}</th>
            <th className={cn(th, "hidden text-left md:table-cell")}>{t("career.league")}</th>
            <th className={cn(th, "w-9")} title={t("player.appearances")}>
              {t("career.apps")}
            </th>
            <th className={cn(th, "w-9")} title={t("player.goals")}>
              {t("career.goals")}
            </th>
            <th className={cn(th, "w-9")} title={t("player.assists")}>
              {t("career.assists")}
            </th>
            <th className={cn(th, "hidden w-14 sm:table-cell")} title={t("player.minutes")}>
              {t("career.minutes")}
            </th>
            <th className={cn(th, "w-8")}>
              <BookingCard color="yellow" className="align-middle" />
              <span className="sr-only">{t("player.yellow")}</span>
            </th>
            <th className={cn(th, "w-8 pr-4 sm:w-10 sm:pr-5")}>
              <BookingCard color="red" className="align-middle" />
              <span className="sr-only">{t("player.red")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={`${s.year}-${s.team?.name ?? ""}-${s.league.slug}-${i}`} className="border-b border-line/70 last:border-0">
              <td className="py-2.5 pl-4 text-[13px] font-semibold tnum sm:pl-5">{s.year}</td>
              <td className="max-w-0 py-2.5 pr-2">
                <Club season={s} />
              </td>
              <td className="hidden py-2.5 pr-2 md:table-cell">
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
                  <LeagueBadge slug={s.league.slug} size="sm" />
                  <span className="truncate">{s.league.name}</span>
                </span>
              </td>
              <td className={td}>{s.appearances ?? "—"}</td>
              <td className={cn(td, (s.goals ?? 0) > 0 && "font-bold text-ink")}>{s.goals ?? "—"}</td>
              <td className={td}>{s.assists ?? "—"}</td>
              <td className={cn(td, "hidden sm:table-cell")}>{s.minutesPlayed != null ? formatNumber(s.minutesPlayed, locale) : "—"}</td>
              <td className={td}>{s.yellowCards ?? "—"}</td>
              <td className={cn(td, "pr-4 sm:pr-5")}>{s.redCards ?? "—"}</td>
            </tr>
          ))}
        </tbody>
        {rows.length > 1 && (
          <tfoot>
            <tr className="border-t border-line bg-surface-2/60 font-bold">
              <td className="py-2.5 pl-4 text-[13px] sm:pl-5" colSpan={2}>
                {t("career.total")}
              </td>
              <td className="hidden md:table-cell" />
              <td className={cn(td, "text-ink")}>{total.appearances}</td>
              <td className={cn(td, "text-ink")}>{total.goals}</td>
              <td className={cn(td, "text-ink")}>{total.assists}</td>
              <td className={cn(td, "hidden text-ink sm:table-cell")}>{formatNumber(total.minutes, locale)}</td>
              <td className={cn(td, "text-ink")}>{total.yellow}</td>
              <td className={cn(td, "pr-4 text-ink sm:pr-5")}>{total.red}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Club({ season }: { season: Season }) {
  const club = season.team;
  if (!club) return <span className="text-[13px] text-ink-3">—</span>;
  const content = (
    <>
      <TeamLogo team={club} size="sm" />
      <span className="truncate">{club.name}</span>
    </>
  );
  const cls = "flex min-w-0 items-center gap-2 text-[13px] font-medium";
  return club.slug ? (
    <Link to={`/team/${club.slug}`} className={cn(cls, "hover:underline")}>
      {content}
    </Link>
  ) : (
    <span className={cls}>{content}</span>
  );
}
