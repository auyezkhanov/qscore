import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, ChevronDown, ChevronRight, Footprints, ListChecks } from "lucide-react";
import type { PlayerMatchLogEntry, PlayerMatchStats } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Card, CardFooterLink, CardHeader } from "@/shared/ui/Card";
import { RatingBadge } from "@/shared/ui/RatingBadge";
import { EmptyState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { BallIcon, BookingCard } from "./icons";

const COLLAPSED = 10;
const RESULT_BG = { W: "bg-win", D: "bg-draw", L: "bg-loss" } as const;
// date | opponent | events | score | minutes (sm+) | rating | disclosure chevron
const ROW =
  "grid grid-cols-[40px_minmax(0,1fr)_auto_44px_36px_14px] items-center gap-x-1.5 px-3 py-2.5 row-hover sm:grid-cols-[52px_minmax(0,1fr)_auto_52px_48px_44px_16px] sm:gap-x-3 sm:px-5";

function resultOf(e: PlayerMatchLogEntry): keyof typeof RESULT_BG | null {
  if (e.homeScore == null || e.awayScore == null) return null;
  const gf = e.isHome ? e.homeScore : e.awayScore;
  const ga = e.isHome ? e.awayScore : e.homeScore;
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

/** The player's matches this season, most recent first; played rows expand to that match's numbers. */
export function MatchLog({ log, isGk }: { log: PlayerMatchLogEntry[]; isGk: boolean }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const entries = [...log].sort((a, b) => b.kickoff.localeCompare(a.kickoff));
  const shown = expanded ? entries : entries.slice(0, COLLAPSED);

  return (
    <Card>
      <CardHeader title={t("player.matchLog")} icon={<ListChecks size={16} />} />
      {entries.length === 0 ? (
        <EmptyState title={t("player.noMatches")} className="py-10" />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {shown.map((e) => (
              <li key={e.matchId}>
                <LogRow entry={e} isGk={isGk} />
              </li>
            ))}
          </ul>
          {entries.length > COLLAPSED && (
            <CardFooterLink onClick={() => setExpanded((v) => !v)}>{expanded ? t("common.showLess") : t("common.showAll")}</CardFooterLink>
          )}
        </>
      )}
    </Card>
  );
}

function LogRow({ entry: e, isGk }: { entry: PlayerMatchLogEntry; isGk: boolean }) {
  const { t, locale } = useI18n();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const stats = e.played ? e.stats : null;

  // Nothing to expand (not played / no numbers): the row stays a plain link to the match.
  if (!stats) {
    return (
      <Link to={`/match/${e.matchId}`} className={cn(ROW, !e.played && "text-ink-3")}>
        <RowCells entry={e} />
        <span />
      </Link>
    );
  }

  const date = formatDate(e.kickoff, locale, { day: "numeric", month: "long" });
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${e.opponent.name}, ${date}. ${t("player.matchStats")}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(ROW, "w-full text-left", open && "bg-surface-2/70")}
      >
        <RowCells entry={e} />
        <ChevronDown size={16} aria-hidden className={cn("justify-self-end text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      <div id={panelId} role="region" aria-label={t("player.matchStats")} hidden={!open} className="bg-surface-2/70 px-3 pb-3 pt-1 sm:px-5">
        <MatchStatsGrid stats={stats} isGk={isGk} />
        <div className="mt-2 flex justify-end">
          <Link
            to={`/match/${e.matchId}`}
            className="-mr-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[13px] font-semibold text-brand transition-colors hover:text-brand-600 dark:hover:text-brand-300"
          >
            {t("player.matchPage")}
            <ChevronRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </>
  );
}

/** The grid cells shared by link rows and expandable rows (everything but the chevron). */
function RowCells({ entry: e }: { entry: PlayerMatchLogEntry }) {
  const { t, locale } = useI18n();
  const result = resultOf(e);
  const minutes = e.played ? t("common.minutesShort", { n: e.minutes }) : "—";
  const minutesTitle = e.played ? (e.started ? t("player.started") : t("player.subbedIn")) : t("player.didNotPlay");

  return (
    <>
      <span className="flex flex-col text-[11px] leading-tight text-ink-3">
        <span className="whitespace-nowrap font-semibold text-ink-2">
          <span className="sm:hidden">{formatDate(e.kickoff, locale, { day: "2-digit", month: "2-digit" })}</span>
          <span className="hidden sm:inline">{formatDate(e.kickoff, locale, { day: "numeric", month: "short" })}</span>
        </span>
        <span>{t("match.roundShort", { round: e.round })}</span>
      </span>

      <span className="flex min-w-0 items-center gap-2">
        <span
          title={e.isHome ? t("player.home") : t("player.away")}
          className="hidden h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-2 text-[10px] font-bold text-ink-3 sm:inline-flex"
        >
          {e.isHome ? t("team.homeShort") : t("team.awayShort")}
        </span>
        <TeamLogo team={e.opponent} size="sm" />
        <span className={cn("truncate text-[13px] sm:text-sm", e.played ? "font-semibold" : "font-medium")}>
          {e.opponent.name}
          <span className="sr-only sm:hidden">, {e.isHome ? t("player.home") : t("player.away")}</span>
        </span>
      </span>

      <span className="flex items-center justify-end gap-1.5">
        {e.goals > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink" title={`${t("player.goals")}: ${e.goals}`}>
            <BallIcon size={13} />
            {e.goals > 1 && <span className="tnum">{e.goals}</span>}
          </span>
        )}
        {e.assists > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink-2" title={`${t("player.assists")}: ${e.assists}`}>
            <Footprints size={13} />
            {e.assists > 1 && <span className="tnum">{e.assists}</span>}
          </span>
        )}
        {e.yellowCard && (
          <span title={t("player.yellow")} className="inline-flex">
            <BookingCard color="yellow" />
          </span>
        )}
        {e.redCard && (
          <span title={t("player.red")} className="inline-flex">
            <BookingCard color="red" />
          </span>
        )}
      </span>

      <span className="flex justify-center">
        {e.homeScore != null && e.awayScore != null ? (
          <span
            className={cn(
              "inline-flex h-6 min-w-[40px] items-center justify-center rounded-md px-1.5 text-xs font-bold text-white tnum sm:min-w-[42px]",
              result ? RESULT_BG[result] : "bg-draw",
            )}
            title={result ? t(`form.${result}`) : undefined}
          >
            {e.homeScore}:{e.awayScore}
          </span>
        ) : (
          <span className="text-xs text-ink-3">–</span>
        )}
      </span>

      <span className="hidden items-center justify-end gap-0.5 text-[13px] tnum sm:flex" title={minutesTitle}>
        {e.played && !e.started && (
          <span className="text-win">
            <ArrowUp size={12} strokeWidth={3} />
          </span>
        )}
        <span className={e.played ? "font-semibold text-ink-2" : "text-ink-3"}>{minutes}</span>
      </span>

      {/* Rating; on phones the minutes sit underneath it instead of in their own column. */}
      <span className="flex flex-col items-end justify-center gap-1">
        <RatingBadge rating={e.played ? e.rating : null} size="sm" className="min-w-[2.25rem]" />
        <span className="inline-flex items-center text-[10px] font-medium leading-none text-ink-3 tnum sm:hidden" title={minutesTitle}>
          {e.played && !e.started && <ArrowUp size={10} strokeWidth={3} className="text-win" />}
          {minutes}
        </span>
      </span>
    </>
  );
}

type StatItem = { label: TranslationKey; value: ReactNode; sub?: string };

function MatchStatsGrid({ stats: s, isGk }: { stats: PlayerMatchStats; isGk: boolean }) {
  const { t, locale } = useI18n();
  const minutes: StatItem = {
    label: "player.minutes",
    value: t("common.minutesShort", { n: s.minutes }),
  };
  const passes: StatItem = {
    label: "stat.passes",
    value: `${s.passesAccurate}/${s.passes}`,
    sub:
      s.passes > 0
        ? t("stat.accuracyN", {
            n: Math.round((s.passesAccurate / s.passes) * 100),
          })
        : undefined,
  };
  const items: StatItem[] = isGk
    ? [minutes, { label: "stat.saves", value: s.saves }, { label: "stat.goalsConceded", value: s.goalsConceded }, passes]
    : [
        minutes,
        {
          label: "stat.shots",
          value: s.shots,
          sub: t("stat.onTargetN", { n: s.shotsOnTarget }),
        },
        {
          label: "stat.xg",
          value: s.xg.toLocaleString(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        passes,
        { label: "stat.keyPasses", value: s.keyPasses },
        {
          label: "stat.dribbles",
          value: s.dribbles,
          sub: t("stat.wonN", { n: s.dribblesWon }),
        },
        { label: "stat.tackles", value: s.tackles },
        { label: "stat.interceptions", value: s.interceptions },
        {
          label: "stat.duels",
          value: s.duels,
          sub: t("stat.wonN", { n: s.duelsWon }),
        },
      ];

  return (
    <dl className={cn("grid gap-1.5", isGk ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-5 xl:grid-cols-9")}>
      {items.map((i) => (
        <div key={i.label} className="flex min-w-0 flex-col items-center rounded-lg bg-surface px-1.5 py-2 text-center shadow-card">
          <dt className="order-2 mt-1 line-clamp-2 w-full hyphens-auto text-[10px] font-semibold uppercase leading-tight text-ink-3" title={t(i.label)}>
            {t(i.label)}
          </dt>
          <dd className="order-1 text-[15px] font-extrabold leading-none tnum">{i.value}</dd>
          {i.sub && <dd className="order-3 mt-0.5 w-full truncate text-[10px] text-ink-3 tnum">{i.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
