import { prisma } from "../../lib/prisma";
import { TtlCache } from "../../lib/cache";
import { HttpError, notFound } from "../../lib/http";
import { localized, type Lang } from "../../lib/i18n";
import { kff } from "../../integrations/kff/client";
import { mapGameStatus, normalizeForm, parseKickoff, teamColor } from "../../integrations/kff/mappers";
import type { FrontMap, Game, TableRow } from "../../integrations/kff/types";
import { LEAGUE_BY_SLUG } from "../../sync/config";
import { teamRefSelect, toTeamRef, type ExternalClubRef, type TeamRef } from "../shared/dto";

// Past seasons are read straight from the source (and cached): they never change,
// and storing them all would multiply the database for a rarely used view.
const frontMapCache = new TtlCache<FrontMap>(6 * 60 * 60 * 1000, 1);
const tableCache = new TtlCache<TableRow[]>(12 * 60 * 60 * 1000, 50);
const gamesCache = new TtlCache<Game[]>(12 * 60 * 60 * 1000, 50);

async function seasonRefs(slug: string) {
  const cfg = LEAGUE_BY_SLUG.get(slug);
  if (!cfg) throw notFound("League");
  const frontMap = await frontMapCache.get("front-map", () => kff.frontMap());
  const entry = frontMap.items[cfg.code];
  return (entry?.seasons ?? []).map((s) => ({ year: s.year, seasonId: s.season_id, current: s.season_id === entry?.season_id }));
}

export async function listSeasons(slug: string) {
  const refs = await seasonRefs(slug).catch((err) => {
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, "UPSTREAM_UNAVAILABLE", "Season list is temporarily unavailable");
  });
  // One entry per year, newest first (the source occasionally lists a year twice).
  const seen = new Set<number>();
  return refs
    .sort((a, b) => b.year - a.year || Number(b.current) - Number(a.current))
    .filter((s) => !seen.has(s.year) && seen.add(s.year))
    .map((s) => ({ year: s.year, current: s.current }));
}

async function seasonId(slug: string, year: number) {
  const ref = (await seasonRefs(slug)).find((s) => s.year === year);
  if (!ref) throw notFound("Season");
  return ref.seasonId;
}

/** Links to our team when it exists in the database, otherwise an external club ref. */
async function clubResolver(lang: Lang) {
  const teams = await prisma.team.findMany({ select: { ...teamRefSelect, externalId: true } });
  const byExt = new Map(teams.map((t) => [t.externalId, t]));
  return (externalId: number, name: string, logoUrl: string | null): TeamRef | ExternalClubRef => {
    const t = byExt.get(externalId);
    return t ? toTeamRef(t, lang) : { id: null, slug: null, name: localized(name, null, lang), logoUrl, color: teamColor(name) };
  };
}

const upstream = (err: unknown): never => {
  if (err instanceof HttpError) throw err;
  throw new HttpError(502, "UPSTREAM_UNAVAILABLE", "Archive is temporarily unavailable");
};

export async function getArchivedStandings(slug: string, year: number, lang: Lang) {
  const id = await seasonId(slug, year).catch(upstream);
  const rows = await tableCache.get(String(id), async () => (await kff.table(id, "ru")).table).catch(upstream);
  const club = await clubResolver(lang);
  return rows.map((r) => ({
    position: r.position,
    played: r.games_played,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    goalsFor: r.goals_scored,
    goalsAgainst: r.goals_conceded,
    goalDiff: r.goals_scored - r.goals_conceded,
    points: r.points,
    form: normalizeForm(r.form).split(",").filter(Boolean),
    zone: r.zone,
    team: club(r.team_id, r.team_name, r.team_logo),
  }));
}

export async function getArchivedRounds(slug: string, year: number, lang: Lang) {
  const id = await seasonId(slug, year).catch(upstream);
  const games = await gamesCache.get(String(id), () => kff.games(id)).catch(upstream);
  const club = await clubResolver(lang);
  const known = new Map(
    (await prisma.match.findMany({ where: { externalId: { in: games.map((g) => g.id) } }, select: { id: true, externalId: true } })).map((m) => [
      m.externalId,
      m.id,
    ]),
  );

  const byRound = new Map<number, unknown[]>();
  for (const g of games) {
    const when = parseKickoff(g.date, g.time);
    if (!when) continue;
    const round = g.tour ?? 0;
    byRound.set(round, [
      ...(byRound.get(round) ?? []),
      {
        /** Our match id when this fixture is in the database (current season), else null. */
        id: known.get(g.id) ?? null,
        round,
        kickoff: when.kickoff.toISOString(),
        timeTbd: when.timeTbd,
        status: mapGameStatus(g).status,
        homeScore: g.home_score,
        awayScore: g.away_score,
        homeTeam: club(g.home_team.id, g.home_team.name, g.home_team.logo_url),
        awayTeam: club(g.away_team.id, g.away_team.name, g.away_team.logo_url),
      },
    ]);
  }
  // The source leaves the round empty for a few rescheduled fixtures: file them
  // under the round whose typical date is closest.
  const orphans = (byRound.get(0) ?? []) as { kickoff: string; round: number }[];
  byRound.delete(0);
  if (orphans.length > 0 && byRound.size > 0) {
    const medians = [...byRound.entries()].map(([round, list]) => {
      const times = (list as { kickoff: string }[]).map((m) => Date.parse(m.kickoff)).sort((x, y) => x - y);
      return { round, median: times[Math.floor((times.length - 1) / 2)] };
    });
    for (const m of orphans) {
      const t = Date.parse(m.kickoff);
      const nearest = medians.reduce((best, r) => (Math.abs(r.median - t) < Math.abs(best.median - t) ? r : best));
      m.round = nearest.round;
      byRound.get(nearest.round)!.push(m);
    }
  } else if (orphans.length > 0) byRound.set(0, orphans);
  const rounds = [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, matches]) => ({ round, matches: (matches as { kickoff: string; round: number }[]).sort((x, y) => x.kickoff.localeCompare(y.kickoff)) }));

  // Some old seasons carry nonsense round numbers (dozens of games in "round 1").
  // A round can't hold more games than half the clubs; if the source breaks
  // that, rebuild matchdays from the calendar instead.
  const clubs = new Set(games.flatMap((g) => [g.home_team.id, g.away_team.id])).size;
  const maxPerRound = Math.ceil(clubs / 2);
  if (rounds.some((r) => r.matches.length > maxPerRound)) return matchdaysByDate(rounds.flatMap((r) => r.matches));
  return rounds;
}

/** Groups fixtures into numbered matchdays: a new one starts after a gap of 36+ hours. */
export function matchdaysByDate<T extends { kickoff: string; round: number }>(matches: T[]): { round: number; matches: T[] }[] {
  const sorted = [...matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const days: { round: number; matches: T[] }[] = [];
  let last = -Infinity;
  for (const m of sorted) {
    const t = Date.parse(m.kickoff);
    if (t - last >= 36 * 60 * 60 * 1000 || days.length === 0) days.push({ round: days.length + 1, matches: [] });
    const day = days[days.length - 1];
    m.round = day.round;
    day.matches.push(m);
    last = t;
  }
  return days;
}
