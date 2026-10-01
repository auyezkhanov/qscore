import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Loader2, Lock, RotateCw, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/client";
import type { PredictionFixture, TeamRef } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { MatchStatusLabel, hasScore, isLive } from "@/features/matches/MatchStatus";
import { ScoreStepper } from "./ScoreStepper";
import { deletePrediction, savePrediction, type Score } from "./predictionApi";

type Status = "idle" | "saving" | "clearing" | "error" | "closed";

const ZERO: Score = { homeScore: 0, awayScore: 0 };
const sameScore = (a: Score, b: Score) => a.homeScore === b.homeScore && a.awayScore === b.awayScore;

/**
 * One fixture to predict: score steppers per side and a Save button with
 * saving / saved / error states. Locked (with the live score) once the match
 * has started or the server reports predictions closed.
 */
export function PredictionCard({ fixture, signedIn, onRequireAuth }: { fixture: PredictionFixture; signedIn: boolean; onRequireAuth: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { match, prediction } = fixture;
  const [draft, setDraft] = useState<Score | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(false), 1800);
    return () => window.clearTimeout(id);
  }, [flash]);

  const locked = !fixture.open || status === "closed";
  const saved: Score | null = prediction && { homeScore: prediction.homeScore, awayScore: prediction.awayScore };
  const value = draft ?? saved ?? ZERO;
  const dirty = !saved || !sameScore(value, saved);
  const busy = status === "saving" || status === "clearing";

  const edit = (patch: Partial<Score>) => {
    setDraft({ ...value, ...patch });
    if (status === "error") setStatus("idle");
  };

  const handleError = (err: unknown) => {
    if (err instanceof ApiError && err.code === "PREDICTIONS_CLOSED") setStatus("closed");
    else if (err instanceof ApiError && err.status === 401) {
      setStatus("idle");
      onRequireAuth();
    } else setStatus("error");
  };

  const save = async () => {
    if (!signedIn) return onRequireAuth();
    setStatus("saving");
    try {
      await savePrediction(queryClient, match.id, value);
      setDraft(null);
      setStatus("idle");
      setFlash(true);
    } catch (err) {
      handleError(err);
    }
  };

  const clear = async () => {
    setStatus("clearing");
    try {
      await deletePrediction(queryClient, match.id);
      setDraft(null);
      setStatus("idle");
    } catch (err) {
      handleError(err);
    }
  };

  const live = isLive(match);
  const lockedOnRequest = signedIn ? undefined : onRequireAuth;

  return (
    <article className={cn("card flex flex-col overflow-hidden", live && "ring-1 ring-live/30")}>
      <header className="flex items-center gap-2 border-b border-line py-1.5 pl-3 pr-1.5 sm:pl-4">
        <LeagueBadge slug={match.league.slug} size="sm" />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-2">
          {match.league.name}
          <span className="text-ink-3"> · {t("match.roundShort", { round: match.round })}</span>
        </span>
        <MatchStatusLabel match={match} className="text-xs" />
        <Link
          to={`/match/${match.id}`}
          aria-label={t("predictor.toMatch")}
          title={t("predictor.toMatch")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink"
        >
          <ChevronRight size={17} />
        </Link>
      </header>

      <div className="flex-1 space-y-2 px-3 py-3 sm:px-4">
        {(["home", "away"] as const).map((side) => {
          const team = side === "home" ? match.homeTeam : match.awayTeam;
          const key = side === "home" ? "homeScore" : "awayScore";
          return (
            <TeamLine key={side} team={team}>
              {locked ? (
                <span className={cn("w-11 text-center text-2xl font-extrabold tnum", live ? "text-live" : "text-ink")}>
                  {hasScore(match) ? match[key] : "–"}
                </span>
              ) : (
                <ScoreStepper value={value[key]} onChange={(n) => edit({ [key]: n })} teamName={team.name} onLocked={lockedOnRequest} />
              )}
            </TeamLine>
          );
        })}
      </div>

      <footer className="flex min-h-[56px] items-center justify-between gap-2 border-t border-line bg-surface-2/40 px-3 py-2 sm:px-4">
        {locked ? (
          <LockedFooter closedNow={status === "closed" && fixture.open} live={live} pick={saved} />
        ) : (
          <>
            <div className="min-w-0 text-xs font-medium">
              {status === "error" ? (
                <span role="alert" className="text-loss">
                  {t("predictor.error")}
                </span>
              ) : saved && !dirty ? (
                <button
                  type="button"
                  onClick={clear}
                  disabled={busy}
                  className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-ink-3 transition hover:bg-surface-3 hover:text-loss disabled:opacity-50"
                >
                  {status === "clearing" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {t("predictor.clear")}
                </button>
              ) : saved ? (
                <button type="button" onClick={() => setDraft(null)} className="-ml-2 inline-flex h-8 items-center rounded-full px-2 text-ink-3 transition hover:bg-surface-3 hover:text-ink">
                  {t("predictor.undo", { home: saved.homeScore, away: saved.awayScore })}
                </button>
              ) : null}
            </div>
            <SaveButton status={status} dirty={dirty} flash={flash} signedIn={signedIn} onClick={save} />
          </>
        )}
      </footer>
    </article>
  );
}

function TeamLine({ team, children }: { team: TeamRef; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamLogo team={team} size="md" />
      <Link to={`/team/${team.slug}`} className="min-w-0 flex-1 truncate text-[15px] font-semibold hover:underline">
        {team.name}
      </Link>
      {children}
    </div>
  );
}

function SaveButton({ status, dirty, flash, signedIn, onClick }: { status: Status; dirty: boolean; flash: boolean; signedIn: boolean; onClick: () => void }) {
  const { t } = useI18n();
  if (!signedIn) {
    return (
      <Button size="sm" onClick={onClick} className="shrink-0">
        {t("predictor.signInToPredict")}
      </Button>
    );
  }
  if (status === "saving") {
    return (
      <Button size="sm" disabled className="shrink-0 !opacity-80" aria-live="polite">
        <Loader2 size={14} className="animate-spin" />
        {t("predictor.saving")}
      </Button>
    );
  }
  if (!dirty) {
    return (
      <span
        aria-live="polite"
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
          flash ? "bg-win text-white animate-pop-in" : "bg-win/10 text-win",
        )}
      >
        <Check size={15} strokeWidth={3} />
        {t("predictor.saved")}
      </span>
    );
  }
  return (
    <Button size="sm" onClick={onClick} disabled={status === "clearing"} className="shrink-0 px-4">
      {status === "error" && <RotateCw size={14} />}
      {status === "error" ? t("common.retry") : t("predictor.save")}
    </Button>
  );
}

function LockedFooter({ closedNow, live, pick }: { closedNow: boolean; live: boolean; pick: Score | null }) {
  const { t } = useI18n();
  return (
    <>
      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-ink-3">
        <Lock size={13} className="shrink-0" />
        <span className="truncate">{closedNow || !live ? t("predictor.closed") : t("predictor.locked")}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-ink-3">
        {pick ? (
          <>
            {t("predictor.yourPick")}
            <span className="rounded-md bg-surface px-2 py-1 text-sm font-extrabold text-ink tnum ring-1 ring-line">
              {pick.homeScore}:{pick.awayScore}
            </span>
          </>
        ) : (
          t("predictor.noPick")
        )}
      </span>
    </>
  );
}
