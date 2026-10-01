import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Shirt } from "lucide-react";
import type { LineupPlayer, MatchDetail, TeamLineup, TeamRef } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { EmptyState } from "@/shared/ui/States";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { RatingBadge } from "@/shared/ui/RatingBadge";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { BallIcon, CardIcon } from "./EventIcons";
import { buildPitchSlots, type PitchSlot } from "./formation";
import { MatchAbsences } from "./MatchAbsences";
import { MatchOfficials } from "./MatchOfficials";
import { Pitch } from "./Pitch";
import { PlayerSheet, type SheetPlayer } from "./PlayerSheet";
import { surname } from "./format";

type Open = (lp: LineupPlayer, side: "home" | "away", starter: boolean) => void;

export function MatchLineups({ match }: { match: MatchDetail }) {
  const { t } = useI18n();
  const [sheet, setSheet] = useState<SheetPlayer | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const potmId = match.playerOfTheMatch?.id ?? null;
  const open: Open = (lp, side, starter) =>
    setSheet({ lp, team: side === "home" ? match.homeTeam : match.awayTeam, starter, potm: lp.player.id === potmId });

  const lineups = match.lineups;
  const hasLineups = !!lineups && (lineups.home.starting.length > 0 || lineups.away.starting.length > 0);
  const hasCoaches = !!(match.coaches.home || match.coaches.away);

  return (
    <div>
      {(hasLineups || hasCoaches) && (
        <div className="grid grid-cols-2 gap-3 border-b border-line px-4 py-3 sm:px-5">
          <FormationHeading team={match.homeTeam} formation={lineups?.home.formation ?? null} coach={match.coaches.home} align="left" />
          <FormationHeading team={match.awayTeam} formation={lineups?.away.formation ?? null} coach={match.coaches.away} align="right" />
        </div>
      )}

      {lineups && hasLineups ? (
        <>
          <div className="p-2 sm:p-4">
            <Pitch>
              {[...buildPitchSlots(lineups.home.starting, "home"), ...buildPitchSlots(lineups.away.starting, "away")].map((s) => (
                <PitchPlayer key={s.lp.player.id} slot={s} potm={s.lp.player.id === potmId} onOpen={open} />
              ))}
            </Pitch>
          </div>

          <div className="grid grid-cols-1 gap-x-6 border-t border-line sm:grid-cols-2">
            <Bench team={match.homeTeam} side="home" lineup={lineups.home} potmId={potmId} onOpen={open} />
            <Bench team={match.awayTeam} side="away" lineup={lineups.away} potmId={potmId} onOpen={open} className="border-t border-line sm:border-t-0" />
          </div>
        </>
      ) : (
        <EmptyState icon={<Shirt size={22} />} title={t("lineups.notYet")} />
      )}

      <MatchAbsences match={match} variant="section" />
      <MatchOfficials officials={match.officials} />

      {sheet && <PlayerSheet player={sheet} onClose={closeSheet} />}
    </div>
  );
}

function FormationHeading({ team, formation, coach, align }: { team: TeamRef; formation: string | null; coach: string | null; align: "left" | "right" }) {
  const { t } = useI18n();
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <TeamLogo team={team} size="md" />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{team.name}</div>
        {formation && <div className="text-xs font-semibold text-ink-3 tnum">{formation}</div>}
        {coach && (
          <div className={cn("flex min-w-0 items-center gap-1 text-[11px] text-ink-3", align === "right" && "justify-end")} title={`${t("match.coach")}: ${coach}`}>
            <Whistle className="shrink-0" />
            <span className="sr-only">{t("match.coach")}: </span>
            <span className="truncate">{coach}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Small coach glyph (a whistle), drawn in currentColor. */
function Whistle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden className={className}>
      <path d="M2 6.5h7.5l4-2v3l-1.6.8A4.5 4.5 0 1 1 2 6.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="6.3" cy="10.2" r="1.3" fill="currentColor" />
    </svg>
  );
}

function PitchPlayer({ slot, potm, onOpen }: { slot: PitchSlot; potm: boolean; onOpen: Open }) {
  const { t } = useI18n();
  const { lp, landscape, portrait, side } = slot;
  const vars = {
    "--pl": `${portrait.left}%`,
    "--pt": `${portrait.top}%`,
    "--ll": `${landscape.left}%`,
    "--lt": `${landscape.top}%`,
  } as CSSProperties;
  const title = [
    lp.player.name,
    lp.rating != null && t("lineups.rating", { rating: lp.rating.toFixed(1) }),
    potm && t("potm.title"),
    lp.isCaptain && t("lineups.captain"),
    lp.goals > 0 && t("lineups.goals", { n: lp.goals }),
    lp.ownGoals > 0 && t("lineups.ownGoals", { n: lp.ownGoals }),
    lp.assists > 0 && t("lineups.assists", { n: lp.assists }),
    lp.card === "yellow" && t("timeline.yellow"),
    lp.card === "red" && t("timeline.red"),
    lp.subbedOut != null && t("lineups.subbedOff", { minute: lp.subbedOut }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onOpen(lp, side, true)}
      title={title}
      aria-label={title}
      aria-haspopup="dialog"
      style={vars}
      className="group absolute left-[var(--pl)] top-[var(--pt)] z-[1] flex w-[64px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-[var(--ll)] sm:top-[var(--lt)] sm:w-[62px] md:w-[76px]"
    >
      <span className="relative flex">
        <PlayerAvatar
          name={lp.player.name}
          photoUrl={lp.player.photoUrl}
          number={lp.shirtNumber}
          size="sm"
          className="h-[30px] w-[30px] shadow-md ring-2 ring-white/90 transition-transform group-hover:scale-110 sm:h-10 sm:w-10 sm:text-sm md:h-11 md:w-11"
        />
        {lp.card && <CardIcon color={lp.card} className="absolute -left-1.5 -top-1 -rotate-12 shadow ring-1 ring-white/80" />}
        <RatingBadge rating={lp.rating} size="xs" star={potm} className="absolute -right-5 -top-1.5 ring-1 ring-white/70 sm:-right-6" />
        {(lp.goals > 0 || lp.ownGoals > 0 || lp.assists > 0) && (
          <span className="absolute -bottom-1.5 -right-2.5 flex items-center gap-px">
            {lp.goals > 0 && <StatBubble count={lp.goals}><BallIcon size={12} /></StatBubble>}
            {lp.ownGoals > 0 && <StatBubble count={lp.ownGoals}><BallIcon size={12} own /></StatBubble>}
            {lp.assists > 0 && (
              <StatBubble count={lp.assists}>
                <span className="text-[8px] font-extrabold leading-none text-black">A</span>
              </StatBubble>
            )}
          </span>
        )}
        {lp.subbedOut != null && (
          <span className="absolute -bottom-1.5 -left-3 flex items-center rounded-full bg-white px-1 text-[9px] font-bold leading-[14px] text-loss shadow tnum">
            <ArrowDown size={9} strokeWidth={3.5} aria-hidden />
            {lp.subbedOut}′
          </span>
        )}
      </span>
      <span className="mt-1 flex max-w-full items-center gap-1 rounded-full bg-black/55 px-1.5 py-[2px] text-[10px] font-semibold leading-tight text-white backdrop-blur-[2px] transition-colors group-hover:bg-black/75 sm:text-[11px]">
        {lp.isCaptain && (
          <span aria-hidden className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[8px] font-extrabold leading-none text-black">
            C
          </span>
        )}
        {lp.shirtNumber != null && <span className="shrink-0 font-bold text-white/65 tnum">{lp.shirtNumber}</span>}
        <span className="truncate">{surname(lp.player.name)}</span>
      </span>
    </button>
  );
}

function StatBubble({ count, children }: { count: number; children: ReactNode }) {
  return (
    <span className="flex h-[14px] min-w-[14px] items-center justify-center gap-px rounded-full bg-white px-[1px] shadow">
      {children}
      {count > 1 && <span className="pr-[2px] text-[8px] font-extrabold leading-none text-black tnum">{count}</span>}
    </span>
  );
}

function Bench({
  team,
  side,
  lineup,
  potmId,
  onOpen,
  className,
}: {
  team: TeamRef;
  side: "home" | "away";
  lineup: TeamLineup;
  potmId: string | null;
  onOpen: Open;
  className?: string;
}) {
  const { t } = useI18n();
  if (lineup.bench.length === 0) return <div className={className} />;
  const bench = [...lineup.bench].sort((a, b) => (a.subbedIn ?? 999) - (b.subbedIn ?? 999));

  return (
    <section className={cn("pb-2", className)}>
      <h3 className="flex items-center gap-2 px-4 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-3 sm:px-5">
        <TeamLogo team={team} size="xs" />
        <span className="truncate">
          {t("lineups.bench")} · {team.name}
        </span>
      </h3>
      <ul>
        {bench.map((p) => (
          <BenchRow key={p.player.id} p={p} potm={p.player.id === potmId} onOpen={() => onOpen(p, side, false)} />
        ))}
      </ul>
    </section>
  );
}

function BenchRow({ p, potm, onOpen }: { p: LineupPlayer; potm: boolean; onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2 text-left row-hover focus-visible:bg-surface-2 focus-visible:outline-none sm:px-5",
          p.subbedIn == null && "opacity-80",
        )}
      >
        <span className="w-5 shrink-0 text-right text-xs font-semibold text-ink-3 tnum">{p.shirtNumber ?? ""}</span>
        <PlayerAvatar name={p.player.name} photoUrl={p.player.photoUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{p.player.name}</span>
          {p.position && <span className="block text-[11px] text-ink-3">{t(`position.${p.position}`)}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {p.goals > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold tnum" title={t("lineups.goals", { n: p.goals })}>
              <BallIcon size={13} />
              {p.goals > 1 && p.goals}
            </span>
          )}
          {p.card && <CardIcon color={p.card} />}
          {p.subbedIn != null && (
            <span className="inline-flex items-center text-xs font-semibold text-win tnum" title={t("lineups.subbedOn", { minute: p.subbedIn })}>
              <ArrowUp size={13} strokeWidth={3} aria-hidden />
              {p.subbedIn}′
            </span>
          )}
          <RatingBadge rating={p.rating} size="sm" star={potm} />
        </span>
      </button>
    </li>
  );
}
