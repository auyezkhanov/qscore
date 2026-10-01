import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, CircleSlash, Clock, Repeat } from "lucide-react";
import type { MatchDetail, MatchEvent, PersonRef } from "@/shared/api/types";
import { useI18n, type TFunction } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { EmptyState } from "@/shared/ui/States";
import { BallIcon, CardIcon } from "./EventIcons";
import { GOAL_TYPES, minuteLabel, sortEvents } from "./format";

/** Chronological match events, home on the left and away on the right of a centre line. */
export function MatchTimeline({ match }: { match: MatchDetail }) {
  const { t } = useI18n();
  const events = sortEvents(match.events);

  if (events.length === 0) {
    return <EmptyState icon={<Clock size={22} />} title={t(match.status === "FINISHED" ? "timeline.none" : "timeline.notYet")} />;
  }

  const secondHalfStart = events.findIndex((e) => e.minute > 45);
  const showHalftime = secondHalfStart > 0;
  const halftimeScore = showHalftime ? lastScore(events.slice(0, secondHalfStart)) : null;
  const finalScore: [number, number] | null = match.homeScore != null && match.awayScore != null ? [match.homeScore, match.awayScore] : null;

  return (
    <ol className="relative px-2 py-5 sm:px-6">
      <span aria-hidden className="absolute bottom-6 left-1/2 top-6 w-px -translate-x-1/2 bg-line" />
      <Divider>{t("timeline.kickoff")}</Divider>
      {events.map((e, i) => (
        <Fragment key={e.id}>
          {showHalftime && i === secondHalfStart && <Divider score={halftimeScore}>{t("timeline.halftime")}</Divider>}
          <EventRow event={e} />
        </Fragment>
      ))}
      {match.status === "FINISHED" && <Divider score={finalScore}>{t("timeline.fulltime")}</Divider>}
    </ol>
  );
}

function lastScore(events: MatchEvent[]): [number, number] {
  for (let i = events.length - 1; i >= 0; i--) {
    const s = events[i].score;
    if (s) return s;
  }
  return [0, 0];
}

function Divider({ children, score }: { children: ReactNode; score?: [number, number] | null }) {
  return (
    <li className="relative my-3 flex justify-center first:mt-0 last:mb-0">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-2">
        {children}
        {score && (
          <span className="tnum text-ink">
            {score[0]} – {score[1]}
          </span>
        )}
      </span>
    </li>
  );
}

function EventRow({ event }: { event: MatchEvent }) {
  const { t } = useI18n();
  const home = event.side === "home";
  const content = <EventContent event={event} mirror={home} t={t} />;

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-center gap-1.5 py-2 sm:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] sm:gap-3">
      <div className="flex justify-end">{home && content}</div>
      <div className="flex justify-center">
        <span
          className={cn(
            "relative z-[1] inline-flex h-7 min-w-[40px] items-center justify-center rounded-full border px-1.5 text-[11px] font-bold tnum sm:text-xs",
            GOAL_TYPES.has(event.type) ? "border-brand bg-brand text-brand-fg" : "border-line bg-surface text-ink-2",
          )}
        >
          {minuteLabel(event)}
        </span>
      </div>
      <div className="flex justify-start">{!home && content}</div>
    </li>
  );
}

function EventContent({ event, mirror, t }: { event: MatchEvent; mirror: boolean; t: TFunction }) {
  const { icon, label, primary, secondary, score } = describe(event, t);
  return (
    <div className={cn("flex min-w-0 max-w-full items-center gap-2 sm:gap-2.5", mirror && "flex-row-reverse text-right")}>
      <span role="img" aria-label={label} title={label} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 sm:h-7 sm:w-7">
        {icon}
      </span>
      <div className="min-w-0 text-[13px] leading-tight sm:text-sm">
        <div className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5", mirror && "justify-end")}>
          <span className="min-w-0 break-words font-semibold">{primary}</span>
          {score && (
            <span className="rounded-md bg-surface-3 px-1.5 py-px text-[11px] font-bold text-ink tnum">
              {score[0]} – {score[1]}
            </span>
          )}
        </div>
        {secondary && <div className="mt-0.5 break-words text-xs text-ink-3">{secondary}</div>}
      </div>
    </div>
  );
}

function PlayerLink({ person }: { person: PersonRef | null }) {
  if (!person) return <>—</>;
  if (!person.slug) return <>{person.name}</>;
  return (
    <Link to={`/player/${person.slug}`} className="hover:underline">
      {person.name}
    </Link>
  );
}

type Described = { icon: ReactNode; label: string; primary: ReactNode; secondary?: ReactNode; score?: [number, number] | null };

function describe(e: MatchEvent, t: TFunction): Described {
  const player = <PlayerLink person={e.player} />;
  const assist = e.relatedPlayer ? <>{t("timeline.assist", { name: "" })}<PlayerLink person={e.relatedPlayer} /></> : undefined;

  switch (e.type) {
    case "GOAL":
      return { icon: <BallIcon size={17} />, label: t("timeline.goal"), primary: player, secondary: assist, score: e.score };
    case "PENALTY_GOAL":
      return {
        icon: <PenaltyBall label={t("match.penShort")} />,
        label: `${t("timeline.goal")} (${t("timeline.penalty")})`,
        primary: player,
        secondary: t("timeline.penalty"),
        score: e.score,
      };
    case "OWN_GOAL":
      return {
        icon: <BallIcon size={17} own />,
        label: `${t("timeline.goal")} (${t("timeline.ownGoal")})`,
        primary: (
          <>
            {player} <span className="font-bold text-loss">{t("match.ownGoalShort")}</span>
          </>
        ),
        secondary: t("timeline.ownGoal"),
        score: e.score,
      };
    case "PENALTY_MISSED":
      return {
        icon: (
          <span className="relative inline-flex">
            <BallIcon size={17} />
            <CircleSlash size={11} strokeWidth={3} className="absolute -bottom-1 -right-1 rounded-full bg-surface text-loss" />
          </span>
        ),
        label: t("timeline.penaltyMissed"),
        primary: player,
        secondary: t("timeline.penaltyMissed"),
      };
    case "YELLOW_CARD":
      return { icon: <CardIcon color="yellow" />, label: t("timeline.yellow"), primary: player };
    case "RED_CARD":
      return { icon: <CardIcon color="red" />, label: t("timeline.red"), primary: player, secondary: t("timeline.red") };
    case "SECOND_YELLOW":
      return { icon: <CardIcon color="red" second />, label: t("timeline.secondYellow"), primary: player, secondary: t("timeline.secondYellow") };
    case "SUBSTITUTION":
      return {
        icon: <Repeat size={14} strokeWidth={2.5} className="text-ink-2" />,
        label: t("timeline.sub"),
        primary: (
          <span>
            <ArrowUp size={13} strokeWidth={3} aria-hidden className="mr-1 inline align-[-2px] text-win" />
            <span className="sr-only">{t("timeline.subIn")}:</span>
            <PlayerLink person={e.relatedPlayer} />
          </span>
        ),
        secondary: (
          <span>
            <ArrowDown size={12} strokeWidth={3} aria-hidden className="mr-1 inline align-[-2px] text-loss" />
            <span className="sr-only">{t("timeline.subOut")}:</span>
            <PlayerLink person={e.player} />
          </span>
        ),
      };
  }
}

function PenaltyBall({ label }: { label: string }) {
  return (
    <span className="relative inline-flex">
      <BallIcon size={17} />
      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-ink px-[3px] text-[7px] font-bold uppercase leading-[10px] text-bg">{label}</span>
    </span>
  );
}
