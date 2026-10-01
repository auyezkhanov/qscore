import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronRight, Clock } from "lucide-react";
import type { LineupPlayer, PlayerMatchStats, TeamRef } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { cn } from "@/shared/lib/utils";
import { Modal } from "@/shared/ui/Modal";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { RatingBadge } from "@/shared/ui/RatingBadge";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { BallIcon, CardIcon } from "./EventIcons";

/** A player of the lineup together with what the sheet needs to know about him. */
export type SheetPlayer = { lp: LineupPlayer; team: TeamRef; starter: boolean; potm: boolean };

type Row = { key: TranslationKey; value: string };
type Section = { key: TranslationKey; rows: Row[] };

const pct = (part: number, total: number) => Math.round((part / total) * 100);

/** Groups a player's numbers into sections, dropping zero rows (keepers always see saves / conceded). */
function buildSections(s: PlayerMatchStats, keeper: boolean): Section[] {
  const row = (key: TranslationKey, show: boolean, value: string | number): Row[] => (show ? [{ key, value: String(value) }] : []);
  const sections: Section[] = [
    {
      key: "sheet.attack",
      rows: [
        ...row("sheet.goals", s.goals > 0, s.goals),
        ...row("sheet.assists", s.assists > 0, s.assists),
        ...row("sheet.shots", s.shots > 0, `${s.shots} (${s.shotsOnTarget})`),
        ...row("sheet.xg", s.xg > 0, s.xg.toFixed(2)),
      ],
    },
    {
      key: "sheet.passing",
      rows: [
        ...row("sheet.passes", s.passes > 0, `${s.passesAccurate}/${s.passes} (${s.passes > 0 ? pct(s.passesAccurate, s.passes) : 0}%)`),
        ...row("sheet.keyPasses", s.keyPasses > 0, s.keyPasses),
        ...row("sheet.crosses", s.crosses > 0, s.crosses),
      ],
    },
    {
      key: "sheet.defence",
      rows: [
        ...row("sheet.dribbles", s.dribbles > 0, `${s.dribblesWon}/${s.dribbles}`),
        ...row("sheet.tackles", s.tackles > 0, s.tackles),
        ...row("sheet.interceptions", s.interceptions > 0, s.interceptions),
        ...row("sheet.recoveries", s.recoveries > 0, s.recoveries),
        ...row("sheet.duels", s.duels > 0, `${s.duelsWon}/${s.duels}`),
      ],
    },
    {
      key: "sheet.discipline",
      rows: [
        ...row("sheet.fouls", s.fouls > 0, s.fouls),
        ...row("sheet.foulsSuffered", s.foulsSuffered > 0, s.foulsSuffered),
        ...row("sheet.offsides", s.offsides > 0, s.offsides),
      ],
    },
  ];
  const gk: Section = {
    key: "sheet.goalkeeping",
    rows: [...row("sheet.saves", keeper || s.saves > 0, s.saves), ...row("sheet.goalsConceded", keeper, s.goalsConceded)],
  };
  // Keepers lead with their own section.
  return (keeper ? [gk, ...sections] : [...sections, gk]).filter((sec) => sec.rows.length > 0);
}

/** Bottom sheet / dialog with one player's numbers in this match. */
export function PlayerSheet({ player, onClose }: { player: SheetPlayer; onClose: () => void }) {
  const { t } = useI18n();
  const { lp, team, starter, potm } = player;
  const played = starter || lp.subbedIn != null;
  const sections = lp.stats ? buildSections(lp.stats, lp.position === "GK") : [];
  const minutes = lp.stats?.minutes ?? null;

  return (
    <Modal title={t("lineups.openSheet")} onClose={onClose} closeLabel={t("sheet.close")}>
      <div className="-mx-6 -mt-2 max-h-[min(68vh,560px)] overflow-y-auto px-6 pb-1">
        <div className="flex items-center gap-3.5">
          <PlayerAvatar name={lp.player.name} photoUrl={lp.player.photoUrl} number={lp.shirtNumber} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-bold leading-tight">{lp.player.name}</p>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
              <TeamLogo team={team} size="xs" />
              <span className="truncate">{team.name}</span>
            </p>
            {(lp.position || lp.shirtNumber != null) && (
              <p className="mt-0.5 text-xs text-ink-3">
                {[lp.position && t(`position.${lp.position}`), lp.shirtNumber != null && `#${lp.shirtNumber}`].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <RatingBadge rating={lp.rating} size="lg" star={potm} />
        </div>

        <ul className="mt-4 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-2">
          {potm && <Chip className="bg-brand/10 text-brand">★ {t("potm.title")}</Chip>}
          {minutes != null && minutes > 0 && (
            <Chip>
              <Clock size={12} aria-hidden />
              {t("sheet.minutes", { n: minutes })}
            </Chip>
          )}
          {lp.goals > 0 && (
            <Chip>
              <BallIcon size={12} />
              {t("lineups.goals", { n: lp.goals })}
            </Chip>
          )}
          {lp.ownGoals > 0 && (
            <Chip>
              <BallIcon size={12} own />
              {t("lineups.ownGoals", { n: lp.ownGoals })}
            </Chip>
          )}
          {lp.card && (
            <Chip>
              <CardIcon color={lp.card} className="h-3 w-2" />
              {t(lp.card === "red" ? "timeline.red" : "timeline.yellow")}
            </Chip>
          )}
          {lp.subbedIn != null && (
            <Chip>
              <ArrowUp size={12} strokeWidth={3} className="text-win" aria-hidden />
              {t("lineups.subbedOn", { minute: lp.subbedIn })}
            </Chip>
          )}
          {lp.subbedOut != null && (
            <Chip>
              <ArrowDown size={12} strokeWidth={3} className="text-loss" aria-hidden />
              {t("lineups.subbedOff", { minute: lp.subbedOut })}
            </Chip>
          )}
        </ul>

        {sections.length > 0 ? (
          <div className="mt-4 space-y-3">
            {sections.map((sec) => (
              <section key={sec.key}>
                <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">{t(sec.key)}</h3>
                <dl className="divide-y divide-line rounded-xl bg-surface-2/70">
                  {sec.rows.map((r) => (
                    <div key={r.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <dt className="min-w-0 text-ink-2">{t(r.key)}</dt>
                      <dd className="shrink-0 font-bold tnum">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-2/70 px-3 py-3 text-center text-sm text-ink-3">{t(played ? "sheet.noStats" : "sheet.unused")}</p>
        )}
      </div>

      <Link
        to={`/player/${lp.player.slug}`}
        className="mt-5 flex h-10 w-full items-center justify-center gap-1 rounded-full bg-brand text-sm font-semibold text-brand-fg shadow-sm transition hover:opacity-90 active:scale-[0.98]"
      >
        {t("sheet.profile")}
        <ChevronRight size={16} strokeWidth={2.5} />
      </Link>
    </Modal>
  );
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 px-2", className)}>{children}</li>;
}
