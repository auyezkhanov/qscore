import { useCallback, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarX, ChevronDown, ChevronLeft, ChevronRight, ListOrdered } from "lucide-react";
import type { ArchivedMatch, ArchivedStandingRow, ClubRef } from "@/shared/api/types";
import { useArchivedRounds, useArchivedStandings } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { cn, signed } from "@/shared/lib/utils";
import { IconButton } from "@/shared/ui/Button";
import { FormBadge } from "@/shared/ui/FormBadge";
import { SkeletonCard, SkeletonRows } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { ZONES, ZoneLegend, zonesIn } from "@/features/standings/zones";
import { TeamLogo } from "@/shared/ui/TeamLogo";

/** Club name with crest; a link only when the club exists in our database. */
function ClubName({ team, className, children }: { team: ClubRef; className?: string; children: ReactNode }) {
  return team.slug ? (
    <Link to={`/team/${team.slug}`} className={cn(className, "hover:underline")}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** Final table of a past season. */
export function ArchivedStandings({ slug, year }: { slug: string; year: number }) {
  const { t } = useI18n();
  const query = useArchivedStandings(slug, year);
  return (
    <section className="card overflow-hidden">
      <QueryState query={query} loading={<SkeletonRows rows={12} rowClassName="h-9" />}>
        {(rows) => (rows.length === 0 ? <EmptyState icon={<ListOrdered size={22} />} title={t("league.archiveEmpty")} /> : <ArchivedTable rows={rows} />)}
      </QueryState>
    </section>
  );
}

function ArchivedTable({ rows }: { rows: ArchivedStandingRow[] }) {
  const { t } = useI18n();
  const zones = zonesIn(rows);
  const th = "py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm sm:min-w-[520px]">
          <thead>
            <tr className="border-b border-line">
              <th className={cn(th, "w-9 pl-3 text-left")}>#</th>
              <th className={cn(th, "text-left")}>{t("standings.team")}</th>
              <th className={cn(th, "w-8 text-center")}>{t("standings.played")}</th>
              <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.wins")}</th>
              <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.draws")}</th>
              <th className={cn(th, "hidden w-8 text-center sm:table-cell")}>{t("standings.losses")}</th>
              <th className={cn(th, "hidden w-16 text-center sm:table-cell")}>{t("standings.goals")}</th>
              <th className={cn(th, "w-10 text-center")}>{t("standings.goalDiff")}</th>
              <th className={cn(th, "w-10 text-center")}>{t("standings.points")}</th>
              <th className={cn(th, "hidden pr-4 text-right md:table-cell")}>{t("standings.form")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const zone = r.zone ? ZONES[r.zone] : undefined;
              return (
                <tr key={`${r.position}-${r.team.name}`} className="border-b border-line/70 last:border-0 row-hover">
                  <td className="relative py-2 pl-3">
                    {zone && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: zone.color }} />}
                    <span className="inline-flex h-6 w-6 items-center justify-center text-[13px] font-semibold text-ink-2 tnum">{r.position}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <ClubName team={r.team} className="flex min-w-0 items-center gap-2.5">
                      <TeamLogo team={r.team} size="sm" />
                      <span className="truncate font-medium">{r.team.name}</span>
                    </ClubName>
                  </td>
                  <td className="py-2 text-center text-ink-2 tnum">{r.played}</td>
                  <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.wins}</td>
                  <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.draws}</td>
                  <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">{r.losses}</td>
                  <td className="hidden py-2 text-center text-ink-2 tnum sm:table-cell">
                    {r.goalsFor}:{r.goalsAgainst}
                  </td>
                  <td className="py-2 text-center text-ink-2 tnum">{signed(r.goalDiff)}</td>
                  <td className="py-2 text-center font-bold tnum">{r.points}</td>
                  <td className="hidden py-2 pr-4 md:table-cell">
                    <div className="flex justify-end gap-1">
                      {r.form.map((f, i) => (
                        <FormBadge key={i} result={f} />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ZoneLegend zones={zones} />
    </div>
  );
}

/** Results of a past season, one round at a time (`?round=`, defaults to the last round). */
export function ArchivedRounds({ slug, year }: { slug: string; year: number }) {
  const query = useArchivedRounds(slug, year);
  return (
    <QueryState query={query} loading={<SkeletonCard rows={8} rowClassName="h-10" />} errorClassName="card">
      {(rounds) => <ArchivedRoundBrowser rounds={rounds} />}
    </QueryState>
  );
}

function ArchivedRoundBrowser({ rounds }: { rounds: { round: number; matches: ArchivedMatch[] }[] }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const setRound = useCallback(
    (round: number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("round", String(round));
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  if (rounds.length === 0) return <EmptyState className="card" icon={<CalendarX size={22} />} title={t("league.archiveEmpty")} />;

  const requested = Number(params.get("round"));
  const found = rounds.findIndex((r) => r.round === requested);
  const index = found >= 0 ? found : rounds.length - 1;
  const current = rounds[index];

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between gap-2 p-1.5">
        <IconButton aria-label={t("league.prevRound")} disabled={index === 0} onClick={() => setRound(rounds[index - 1].round)}>
          <ChevronLeft size={20} />
        </IconButton>
        <label className="relative min-w-0">
          <span className="sr-only">{t("league.selectRound")}</span>
          <select
            value={current.round}
            onChange={(e) => setRound(Number(e.target.value))}
            className="h-10 max-w-full cursor-pointer appearance-none truncate rounded-full bg-surface-2 pl-5 pr-10 text-sm font-bold text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {rounds.map((r) => (
              <option key={r.round} value={r.round}>
                {t("match.round", { round: r.round })}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-3" />
        </label>
        <IconButton aria-label={t("league.nextRound")} disabled={index === rounds.length - 1} onClick={() => setRound(rounds[index + 1].round)}>
          <ChevronRight size={20} />
        </IconButton>
      </div>

      <section className="card overflow-hidden">
        {current.matches.length === 0 ? (
          <EmptyState icon={<CalendarX size={22} />} title={t("league.noMatches")} />
        ) : (
          <ul className="divide-y divide-line">
            {current.matches.map((m, i) => (
              <li key={m.id ?? `${current.round}-${i}`}>
                <ArchivedMatchRow match={m} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ROW =
  "grid grid-cols-[38px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 px-2 py-2.5 sm:grid-cols-[64px_minmax(0,1fr)_auto_minmax(0,1fr)_64px] sm:px-3";

function ArchivedMatchRow({ match }: { match: ArchivedMatch }) {
  const { t, locale } = useI18n();
  const scored = match.homeScore != null && match.awayScore != null;
  const homeWon = scored && match.homeScore! > match.awayScore!;
  const awayWon = scored && match.awayScore! > match.homeScore!;
  const status = match.status === "POSTPONED" ? t("match.postponed") : match.status === "CANCELLED" ? t("match.cancelled") : null;

  const body = (
    <>
      <span className="text-center text-[11px] font-medium leading-tight text-ink-3">
        {formatDate(match.kickoff, locale, { day: "numeric", month: "short" })}
      </span>
      <Side team={match.homeTeam} align="right" bold={homeWon} dim={awayWon} />
      <span className="min-w-[52px] text-center">
        {scored ? (
          <span className="rounded-md px-2 py-0.5 text-[15px] font-bold tnum">
            {match.homeScore}
            <span className="mx-0.5 text-ink-3">-</span>
            {match.awayScore}
          </span>
        ) : (
          <span className="text-xs font-semibold text-ink-3">{status ?? t("match.vs")}</span>
        )}
      </span>
      <Side team={match.awayTeam} align="left" bold={awayWon} dim={homeWon} />
      <span aria-hidden className="hidden sm:block" />
    </>
  );

  return match.id ? (
    <Link to={`/match/${match.id}`} className={cn(ROW, "row-hover")}>
      {body}
    </Link>
  ) : (
    <div className={ROW}>{body}</div>
  );
}

function Side({ team, align, bold, dim }: { team: ClubRef; align: "left" | "right"; bold: boolean; dim: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <TeamLogo team={team} size="sm" />
      <span className={cn("line-clamp-2 break-words text-[13px] leading-tight sm:text-sm", bold ? "font-bold" : "font-medium", dim && "text-ink-2")}>
        {team.name}
      </span>
    </span>
  );
}
