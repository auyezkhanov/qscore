import { Link } from "react-router-dom";
import { Gauge } from "lucide-react";
import { useStandings } from "@/shared/api/queries";
import type { MatchSummary, TeamDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { TeamLogo } from "@/shared/ui/TeamLogo";

type Level = "hard" | "medium" | "easy";

const TONES: Record<Level, { chip: string; label: string; dot: string }> = {
  hard: { chip: "bg-loss/10 ring-loss/30", label: "text-loss", dot: "bg-loss" },
  medium: { chip: "bg-amber-500/10 ring-amber-500/30", label: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  easy: { chip: "bg-win/10 ring-win/30", label: "text-win", dot: "bg-win" },
};

/** Top third of the table = hard, bottom third = easy. */
function levelFor(position: number, teams: number): Level {
  if (position <= Math.ceil(teams / 3)) return "hard";
  if (position > Math.floor((teams * 2) / 3)) return "easy";
  return "medium";
}

const NEXT = 3;

/** FotMob-style "fixture difficulty": the next opponents tinted by their current league position. */
export function FixtureDifficulty({ team }: { team: TeamDetail }) {
  const { t } = useI18n();
  const standings = useStandings(team.league?.slug);
  const next = team.upcomingMatches.slice(0, NEXT);
  if (next.length === 0) return null;

  const rows = standings.data ?? [];
  const positions = new Map(rows.map((r) => [r.team.id, r.position]));

  return (
    <Card>
      <CardHeader title={t("difficulty.title")} icon={<Gauge size={16} />} />
      <ul className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
        {next.map((m) => {
          const home = m.homeTeam.id === team.id;
          const opponent = home ? m.awayTeam : m.homeTeam;
          const pos = positions.get(opponent.id);
          const level = pos != null && rows.length > 0 ? levelFor(pos, rows.length) : null;
          return (
            <li key={m.id} className="min-w-0">
              {standings.isPending && !!team.league ? (
                <Skeleton className="h-[136px] rounded-xl" />
              ) : (
                <Chip match={m} opponent={opponent} home={home} position={pos} level={level} />
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-3 sm:px-5">{t("difficulty.hint")}</p>
    </Card>
  );
}

function Chip({
  match,
  opponent,
  home,
  position,
  level,
}: {
  match: MatchSummary;
  opponent: MatchSummary["homeTeam"];
  home: boolean;
  position: number | undefined;
  level: Level | null;
}) {
  const { t, locale } = useI18n();
  const tone = level ? TONES[level] : null;
  const venue = home ? t("team.homeShort") : t("team.awayShort");
  const levelLabel = level ? t(`difficulty.${level}` as const) : null;

  return (
    <Link
      to={`/match/${match.id}`}
      aria-label={[opponent.name, venue, levelLabel, formatDate(match.kickoff, locale, { day: "numeric", month: "long" })].filter(Boolean).join(", ")}
      className={cn(
        "flex h-full flex-col items-center gap-1.5 rounded-xl px-1.5 py-3 text-center ring-1 ring-inset transition hover:brightness-95 active:scale-[0.98] dark:hover:brightness-110",
        tone ? tone.chip : "bg-surface-2 ring-line",
      )}
    >
      <TeamLogo team={opponent} size="lg" />
      <span className="w-full truncate text-[13px] font-semibold leading-tight">{opponent.name}</span>
      <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-3">
        <span className="rounded bg-surface px-1 text-ink-2 ring-1 ring-line">{venue}</span>
        {position != null && <span className="tnum">#{position}</span>}
      </span>
      {tone && levelLabel ? (
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide", tone.label)}>
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
          {levelLabel}
        </span>
      ) : (
        <span className="text-[11px] text-ink-3">—</span>
      )}
      <span className="text-[11px] text-ink-3">{formatDate(match.kickoff, locale, { day: "numeric", month: "short" })}</span>
    </Link>
  );
}
