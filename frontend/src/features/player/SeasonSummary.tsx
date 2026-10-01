import { CalendarRange } from "lucide-react";
import type { PlayerDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatNumber } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/ui/Card";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { RatingBadge } from "@/shared/ui/RatingBadge";
import { StatTile } from "@/features/team/StatTile";
import { BookingCard } from "./icons";

/** Headline numbers for the current season (goalkeepers get conceded / clean sheets instead of G+A). */
export function SeasonSummary({ player }: { player: PlayerDetail }) {
  const { t, locale } = useI18n();
  const s = player.season;
  const adv = player.advancedStats;
  const isGk = player.position === "GK";
  const dash = (n: number | null | undefined) => (n == null ? "—" : n);

  return (
    <Card>
      <CardHeader
        title={player.seasonYear ? t("player.season", { year: player.seasonYear }) : t("player.seasonCurrent")}
        icon={<CalendarRange size={16} />}
        action={
          player.league && (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
              <LeagueBadge slug={player.league.slug} size="sm" />
              <span className="hidden sm:inline">{player.league.name}</span>
            </span>
          )
        }
      />
      {player.rating && (
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 sm:mx-4 sm:mt-4">
          <RatingBadge rating={player.rating.average} size="lg" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-bold">{t("player.ratingSeason")}</div>
            <div className="mt-0.5 truncate text-xs text-ink-3">{t("player.ratingMatches", { n: player.rating.matches })}</div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-6 sm:p-4">
        <StatTile value={s.appearances} label={t("player.appearances")} />
        <StatTile value={formatNumber(s.minutesPlayed, locale)} label={t("player.minutes")} />
        {isGk ? (
          <>
            <StatTile value={dash(adv?.goalsConceded)} label={t("player.conceded")} />
            <StatTile value={dash(adv?.cleanSheets)} label={t("player.cleanSheets")} />
          </>
        ) : (
          <>
            <StatTile value={s.goals} label={t("player.goals")} />
            <StatTile value={s.assists} label={t("player.assists")} />
          </>
        )}
        <StatTile
          value={
            <span className="inline-flex items-center gap-1.5">
              <BookingCard color="yellow" />
              {s.yellowCards}
            </span>
          }
          label={t("player.yellow")}
        />
        <StatTile
          value={
            <span className="inline-flex items-center gap-1.5">
              <BookingCard color="red" />
              {s.redCards}
            </span>
          }
          label={t("player.red")}
        />
      </div>
    </Card>
  );
}
