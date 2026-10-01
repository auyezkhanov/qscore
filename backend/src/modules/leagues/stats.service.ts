import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { localized, type Lang } from "../../lib/i18n";
import { requireCurrentSeasonId, teamRefSelect, toTeamRef } from "../shared/dto";

/** Leaderboards built from per-match stats (the season totals come from the source). */
export const MATCH_STATS = ["rating", "xg", "shots", "shotsOnTarget", "keyPasses", "dribblesWon", "tackles", "interceptions", "saves", "cleanSheets"] as const;
/** Leaderboards built from the season columns on the player row. */
export const SEASON_STATS = ["goals", "assists", "marketValue", "yellowCards", "redCards", "minutesPlayed"] as const;
export type LeaderStat = (typeof MATCH_STATS)[number] | (typeof SEASON_STATS)[number];

const playerSelect = {
  id: true,
  slug: true,
  name: true,
  nameEn: true,
  photoUrl: true,
  position: true,
  goals: true,
  assists: true,
  appearances: true,
  minutesPlayed: true,
  marketValue: true,
  team: { select: teamRefSelect },
} as const;

type PlayerRow = Prisma.PlayerGetPayload<{ select: typeof playerSelect }>;

function toLeader(p: PlayerRow, value: number, matches: number, lang: Lang) {
  return {
    id: p.id,
    slug: p.slug,
    name: localized(p.name, p.nameEn, lang),
    photoUrl: p.photoUrl,
    position: p.position,
    goals: p.goals,
    assists: p.assists,
    appearances: p.appearances,
    minutesPlayed: p.minutesPlayed,
    marketValue: p.marketValue,
    team: toTeamRef(p.team, lang),
    /** The ranked figure (an average for "rating", a total otherwise). */
    value,
    /** Matches the figure is based on. */
    matches,
  };
}

export async function getLeaders(slug: string, stat: LeaderStat, limit: number, lang: Lang) {
  const seasonId = await requireCurrentSeasonId(slug);
  const inLeague = { team: { standings: { some: { seasonId } } } };

  if (stat === "marketValue") {
    // Market value ranks the current squads of the league.
    const players = await prisma.player.findMany({
      where: { ...inLeague, isActive: true, marketValue: { gt: 0 } },
      orderBy: [{ marketValue: { sort: "desc", nulls: "last" } }, { appearances: "desc" }],
      take: limit,
      select: playerSelect,
    });
    return players.map((p) => toLeader(p, p.marketValue ?? 0, p.appearances, lang));
  }

  if ((SEASON_STATS as readonly string[]).includes(stat)) {
    // Season totals in THIS league, summed over every club the player played for in it
    // (a mid-season move keeps his goals in the league where he scored them).
    const col = stat as Exclude<(typeof SEASON_STATS)[number], "marketValue">;
    const groups = await prisma.playerSeasonStat.groupBy({
      by: ["playerId"],
      where: { seasonId, [col]: { gt: 0 } },
      _sum: { [col]: true, appearances: true, minutesPlayed: true },
      orderBy: [{ _sum: { [col]: "desc" } }, { _sum: { minutesPlayed: "asc" } }],
      take: limit,
    });
    const players = new Map(
      (await prisma.player.findMany({ where: { id: { in: groups.map((g) => g.playerId) } }, select: playerSelect })).map((p) => [p.id, p]),
    );
    return groups
      .filter((g) => players.has(g.playerId))
      .map((g) => {
        const sums = g._sum as Record<string, number | null>;
        return toLeader(players.get(g.playerId)!, sums[col] ?? 0, sums.appearances ?? 0, lang);
      });
  }

  const where: Prisma.PlayerMatchStatWhereInput = { match: { seasonId, status: "FINISHED" } };
  let rows: { playerId: string; value: number; matches: number }[];

  if (stat === "rating") {
    // Averages need a fair sample: at least a third of the rounds played so far.
    const played = await prisma.match.count({ where: { seasonId, status: "FINISHED" } });
    const teams = await prisma.standing.count({ where: { seasonId } });
    const rounds = teams > 1 ? Math.floor((played * 2) / teams) : 0;
    const minMatches = Math.max(3, Math.floor(rounds / 3));
    const groups = await prisma.playerMatchStat.groupBy({
      by: ["playerId"],
      where: { ...where, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
      having: { rating: { _count: { gte: minMatches } } },
      orderBy: { _avg: { rating: "desc" } },
      take: limit,
    });
    rows = groups.map((g) => ({ playerId: g.playerId, value: Math.round((g._avg.rating ?? 0) * 100) / 100, matches: g._count.rating }));
  } else if (stat === "cleanSheets") {
    const groups = await prisma.playerMatchStat.groupBy({
      by: ["playerId"],
      where: { ...where, minutes: { gte: 60 }, goalsConceded: 0, player: { position: "GK" } },
      _count: { _all: true },
      orderBy: { _count: { playerId: "desc" } },
      take: limit,
    });
    rows = groups.map((g) => ({ playerId: g.playerId, value: g._count._all, matches: g._count._all }));
  } else {
    const col = stat;
    const groups = await prisma.playerMatchStat.groupBy({
      by: ["playerId"],
      where,
      _sum: { [col]: true },
      _count: { _all: true },
      orderBy: { _sum: { [col]: "desc" } },
      take: limit,
    });
    rows = groups
      .map((g) => {
        const sum = (g._sum as Record<string, number | null>)[col] ?? 0;
        return { playerId: g.playerId, value: col === "xg" ? Math.round(sum * 100) / 100 : sum, matches: g._count._all };
      })
      .filter((r) => r.value > 0);
  }

  const players = new Map(
    (await prisma.player.findMany({ where: { id: { in: rows.map((r) => r.playerId) } }, select: playerSelect })).map((p) => [p.id, p]),
  );
  return rows.filter((r) => players.has(r.playerId)).map((r) => toLeader(players.get(r.playerId)!, r.value, r.matches, lang));
}

/** Per-club season aggregates for the "team stats" view. */
export async function getTeamStats(slug: string, lang: Lang) {
  const seasonId = await requireCurrentSeasonId(slug);
  const [standings, matches, stats] = await Promise.all([
    prisma.standing.findMany({ where: { seasonId }, include: { team: { select: teamRefSelect } } }),
    prisma.match.findMany({
      where: { seasonId, status: "FINISHED", homeScore: { not: null }, awayScore: { not: null } },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    }),
    prisma.matchStat.findMany({ where: { match: { seasonId, status: "FINISHED" } }, select: { matchId: true, teamId: true, possession: true, shots: true, shotsOnTarget: true, xg: true, passAccuracy: true, passes: true, corners: true, yellowCards: true, redCards: true } }),
  ]);

  const statsByMatch = new Map<string, typeof stats>();
  for (const s of stats) statsByMatch.set(s.matchId, [...(statsByMatch.get(s.matchId) ?? []), s]);

  return standings
    .map((row) => {
      const teamId = row.teamId;
      const own = stats.filter((s) => s.teamId === teamId);
      const against = own.map((s) => statsByMatch.get(s.matchId)?.find((x) => x.teamId !== teamId)).filter((x): x is (typeof stats)[number] => !!x);
      const played = matches.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
      const cleanSheets = played.filter((m) => (m.homeTeamId === teamId ? m.awayScore : m.homeScore) === 0).length;
      const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
      const sum = (xs: (number | null)[]) => {
        const v = xs.filter((x): x is number => x != null);
        return v.length ? Math.round(v.reduce((a, b) => a + b, 0) * 10) / 10 : null;
      };
      return {
        team: toTeamRef(row.team, lang),
        played: row.played,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalsPerMatch: row.played ? Math.round((row.goalsFor / row.played) * 100) / 100 : 0,
        concededPerMatch: row.played ? Math.round((row.goalsAgainst / row.played) * 100) / 100 : 0,
        cleanSheets,
        possession: avg(own.map((s) => s.possession)),
        shotsPerMatch: avg(own.map((s) => s.shots)),
        shotsOnTargetPerMatch: avg(own.map((s) => s.shotsOnTarget)),
        xgFor: sum(own.map((s) => s.xg)),
        xgAgainst: sum(against.map((s) => s.xg)),
        passAccuracy: avg(own.filter((s) => s.passes > 0).map((s) => s.passAccuracy)),
        cornersPerMatch: avg(own.map((s) => s.corners)),
        yellowCards: own.reduce((a, s) => a + s.yellowCards, 0),
        redCards: own.reduce((a, s) => a + s.redCards, 0),
      };
    })
    .sort((a, b) => b.goalsFor - a.goalsFor);
}
