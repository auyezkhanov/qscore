import { Link } from "react-router-dom";
import { History, LogIn } from "lucide-react";
import type { PredictionFixture, TeamRef } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { MatchStatusLabel, isLive } from "@/features/matches/MatchStatus";
import { StatTile } from "@/features/team/StatTile";
import { PointsBadge } from "./PointsBadge";

type Row = { fixture: PredictionFixture; total: number | null };

/** The user's predictions for matches that have kicked off: pick vs result, points and a running total. */
export function ResultsTab({ fixtures, signedIn, onRequireAuth }: { fixtures: PredictionFixture[]; signedIn: boolean; onRequireAuth: () => void }) {
  const { t } = useI18n();

  if (!signedIn) {
    return (
      <div className="card">
        <EmptyState
          icon={<History size={22} />}
          title={t("predictor.results.signedOut")}
          text={t("predictor.signInText")}
          action={
            <Button size="sm" onClick={onRequireAuth}>
              <LogIn size={15} />
              {t("predictor.signInCta")}
            </Button>
          }
        />
      </div>
    );
  }

  const chronological = fixtures
    .filter((f) => f.prediction && !f.open)
    .sort((a, b) => a.match.kickoff.localeCompare(b.match.kickoff));

  if (chronological.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={<History size={22} />} title={t("predictor.results.empty.title")} text={t("predictor.results.empty.text")} />
      </div>
    );
  }

  let running = 0;
  const rows: Row[] = chronological.map((fixture) => {
    const points = fixture.prediction?.points;
    if (points == null) return { fixture, total: null };
    running += points;
    return { fixture, total: running };
  });
  const scored = chronological.flatMap((f) => (f.prediction?.points != null ? [f.prediction.points] : []));

  return (
    <Card>
      <CardHeader title={t("predictor.tab.results")} icon={<History size={17} />} />
      <div className="grid grid-cols-4 gap-2 border-b border-line p-3 sm:p-4">
        <StatTile value={running} label={t("predictor.stat.points")} />
        <StatTile value={scored.filter((p) => p === 3).length} label={t("predictor.stat.exact")} />
        <StatTile value={scored.filter((p) => p > 0).length} label={t("predictor.stat.outcomes")} />
        <StatTile value={chronological.length} label={t("predictor.stat.predictions")} />
      </div>
      <p className="px-4 pt-3 text-xs text-ink-3 sm:px-5">{t("predictor.results.hint")}</p>
      <ul className="divide-y divide-line">
        {rows.reverse().map((row) => (
          <ResultRow key={row.fixture.match.id} {...row} />
        ))}
      </ul>
    </Card>
  );
}

function ResultRow({ fixture, total }: Row) {
  const { t, locale } = useI18n();
  const { match, prediction } = fixture;
  const live = isLive(match);
  if (!prediction) return null;

  return (
    <li>
      <Link to={`/match/${match.id}`} className={cn("flex items-center gap-3 px-3 py-3 row-hover sm:px-5", live && "bg-live/[0.04]")}>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
            <span>{formatDate(match.kickoff, locale, { day: "numeric", month: "short" })}</span>
            <span aria-hidden>·</span>
            <MatchStatusLabel match={match} className="text-[11px]" />
          </p>
          <TeamScore team={match.homeTeam} score={match.homeScore} live={live} />
          <TeamScore team={match.awayTeam} score={match.awayScore} live={live} />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{t("predictor.yourPickShort")}</span>
          <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-extrabold tnum ring-1 ring-line">
            {prediction.homeScore}:{prediction.awayScore}
          </span>
        </div>

        <div className="flex w-12 shrink-0 flex-col items-center gap-1">
          {prediction.points != null ? (
            <PointsBadge points={prediction.points} />
          ) : (
            <span className="inline-flex h-8 items-center rounded-lg bg-surface-2 px-2 text-[11px] font-semibold text-ink-3">
              {live ? t("predictor.inPlay") : t("predictor.pending")}
            </span>
          )}
          {total != null && (
            <span title={t("predictor.runningTotal", { n: total })} className="text-[10px] font-semibold text-ink-3 tnum">
              Σ {total}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function TeamScore({ team, score, live }: { team: TeamRef; score: number | null; live: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TeamLogo team={team} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{team.name}</span>
      <span className={cn("w-5 text-right text-sm font-bold tnum", live ? "text-live" : "text-ink")}>{score ?? "–"}</span>
    </div>
  );
}
