import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/http";
import { localized, type Lang } from "../../lib/i18n";
import { matchSummaryInclude, toMatchSummary, toTeamRef, teamRefSelect } from "../shared/dto";

type Result = "W" | "D" | "L";
type Played = { id: string; kickoff: Date; homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number };

export type Fact = {
  /** i18n key suffix, rendered by the frontend as `fact.<key>` */
  key: string;
  side: "home" | "away" | null;
  params: Record<string, string | number>;
};

const resultOf = (m: Played, teamId: string): Result => {
  const isHome = m.homeTeamId === teamId;
  const gf = isHome ? m.homeScore : m.awayScore;
  const ga = isHome ? m.awayScore : m.homeScore;
  return gf > ga ? "W" : gf < ga ? "L" : "D";
};
const goalsFor = (m: Played, teamId: string) => (m.homeTeamId === teamId ? m.homeScore : m.awayScore);
const goalsAgainst = (m: Played, teamId: string) => (m.homeTeamId === teamId ? m.awayScore : m.homeScore);

/** Length of the run at the start of `results` (most recent first) that satisfies `ok`. */
export function runLength(results: Result[], ok: (r: Result) => boolean): number {
  let n = 0;
  while (n < results.length && ok(results[n])) n++;
  return n;
}

/** The single most notable streak of a team, if any. Results are most recent first. */
export function streakFact(results: Result[]): { key: string; n: number } | null {
  const wins = runLength(results, (r) => r === "W");
  if (wins >= 3) return { key: "winStreak", n: wins };
  const losses = runLength(results, (r) => r === "L");
  if (losses >= 3) return { key: "loseStreak", n: losses };
  const unbeaten = runLength(results, (r) => r !== "L");
  if (unbeaten >= 4) return { key: "unbeaten", n: unbeaten };
  const winless = runLength(results, (r) => r !== "W");
  if (winless >= 4) return { key: "winless", n: winless };
  return null;
}

/** Points per game at home (or away) for every club in a set of matches. */
function venueTable(matches: Played[], venue: "home" | "away") {
  const table = new Map<string, { points: number; played: number }>();
  for (const m of matches) {
    const teamId = venue === "home" ? m.homeTeamId : m.awayTeamId;
    const r = resultOf(m, teamId);
    const row = table.get(teamId) ?? { points: 0, played: 0 };
    row.points += r === "W" ? 3 : r === "D" ? 1 : 0;
    row.played++;
    table.set(teamId, row);
  }
  return [...table.entries()]
    .filter(([, r]) => r.played >= 3)
    .sort((a, b) => b[1].points / b[1].played - a[1].points / a[1].played);
}

export async function getMatchPreview(id: string, lang: Lang) {
  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: { select: teamRefSelect }, awayTeam: { select: teamRefSelect } },
  });
  if (!match) throw notFound("Match");

  const season = (await prisma.match.findMany({
    where: { seasonId: match.seasonId, status: "FINISHED", homeScore: { not: null }, awayScore: { not: null }, kickoff: { lt: match.kickoff } },
    orderBy: { kickoff: "desc" },
    select: { id: true, kickoff: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  })) as Played[];

  const teams = { home: match.homeTeam, away: match.awayTeam };
  const teamName = (side: "home" | "away") => localized(teams[side].name, teams[side].nameEn, lang);

  // --- form: last five before this match, most recent first ---
  const lastFive = (teamId: string) => season.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId).slice(0, 5);
  const formRows = await prisma.match.findMany({
    where: { id: { in: [...lastFive(match.homeTeamId), ...lastFive(match.awayTeamId)].map((m) => m.id) } },
    include: matchSummaryInclude,
  });
  const byId = new Map(formRows.map((m) => [m.id, toMatchSummary(m, lang)]));
  const form = (teamId: string) =>
    lastFive(teamId).map((m) => ({ match: byId.get(m.id)!, result: resultOf(m, teamId) }));

  // --- next fixture of each club after this one ---
  const nextOf = async (teamId: string) => {
    const next = await prisma.match.findFirst({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }], kickoff: { gt: match.kickoff }, status: { not: "CANCELLED" } },
      orderBy: { kickoff: "asc" },
      include: matchSummaryInclude,
    });
    return next ? toMatchSummary(next, lang) : null;
  };

  // --- facts ---
  const facts: Fact[] = [];
  for (const side of ["home", "away"] as const) {
    const teamId = teams[side].id;
    const played = season.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
    const results = played.map((m) => resultOf(m, teamId));
    const streak = streakFact(results);
    if (streak) facts.push({ key: streak.key, side, params: { team: teamName(side), n: streak.n } });

    const five = played.slice(0, 5);
    if (five.length === 5) {
      const scored = five.reduce((s, m) => s + goalsFor(m, teamId), 0);
      const cleanSheets = five.filter((m) => goalsAgainst(m, teamId) === 0).length;
      if (scored >= 10) facts.push({ key: "scoredLast5", side, params: { team: teamName(side), n: scored } });
      if (cleanSheets >= 3) facts.push({ key: "cleanSheetsLast5", side, params: { team: teamName(side), n: cleanSheets } });
    }
  }

  const homeTable = venueTable(season, "home");
  const awayTable = venueTable(season, "away");
  if (homeTable[0]?.[0] === match.homeTeamId) facts.push({ key: "bestHome", side: "home", params: { team: teamName("home") } });
  if (awayTable[0]?.[0] === match.awayTeamId) facts.push({ key: "bestAway", side: "away", params: { team: teamName("away") } });
  if (homeTable.length > 3 && homeTable[homeTable.length - 1][0] === match.homeTeamId)
    facts.push({ key: "worstHome", side: "home", params: { team: teamName("home") } });

  // Top scorers (current squads)
  const [leagueTopRow] = await prisma.playerSeasonStat.groupBy({
    by: ["playerId"],
    where: { seasonId: match.seasonId },
    _sum: { goals: true, minutesPlayed: true },
    orderBy: [{ _sum: { goals: "desc" } }, { _sum: { minutesPlayed: "asc" } }],
    take: 1,
  });
  const leagueTop = leagueTopRow ? { id: leagueTopRow.playerId } : null;
  for (const side of ["home", "away"] as const) {
    const top = await prisma.player.findFirst({
      where: { teamId: teams[side].id, isActive: true, goals: { gte: 3 } },
      orderBy: [{ goals: "desc" }, { minutesPlayed: "asc" }],
      select: { id: true, name: true, nameEn: true, goals: true },
    });
    if (top)
      facts.push({
        key: top.id === leagueTop?.id ? "leagueTopScorer" : "teamTopScorer",
        side,
        params: { team: teamName(side), player: localized(top.name, top.nameEn, lang), n: top.goals },
      });
  }

  // Head-to-head (all seasons we know)
  const h2h = (await prisma.match.findMany({
    where: {
      id: { not: match.id },
      status: "FINISHED",
      homeScore: { not: null },
      kickoff: { lt: match.kickoff },
      OR: [
        { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
        { homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId },
      ],
    },
    orderBy: { kickoff: "desc" },
    take: 10,
    select: { id: true, kickoff: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  })) as Played[];
  for (const side of ["home", "away"] as const) {
    const results = h2h.map((m) => resultOf(m, teams[side].id));
    const wins = runLength(results, (r) => r === "W");
    if (wins >= 2) facts.push({ key: "h2hWinStreak", side, params: { team: teamName(side), n: wins } });
  }
  if (h2h.length >= 3) {
    const avg = h2h.reduce((s, m) => s + m.homeScore + m.awayScore, 0) / h2h.length;
    if (avg >= 3) facts.push({ key: "h2hGoals", side: null, params: { avg: avg.toFixed(1) } });
  }

  return {
    form: { home: form(match.homeTeamId), away: form(match.awayTeamId) },
    nextMatches: { home: await nextOf(match.homeTeamId), away: await nextOf(match.awayTeamId) },
    teams: { home: toTeamRef(match.homeTeam, lang), away: toTeamRef(match.awayTeam, lang) },
    facts: facts.slice(0, 8),
  };
}
