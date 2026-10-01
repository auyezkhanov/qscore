import { prisma } from "../../lib/prisma";
import { HttpError, notFound } from "../../lib/http";
import { TtlCache } from "../../lib/cache";
import { createLogger } from "../../lib/logger";
import { countryName, localized, type Lang } from "../../lib/i18n";
import { kff, KffError } from "../../integrations/kff/client";
import { teamColor } from "../../integrations/kff/mappers";
import type { FrontMap, PlayerProfile, PlayerSeasonStats } from "../../integrations/kff/types";
import { LEAGUE_BY_CODE, type LeagueConfig } from "../../sync/config";
import { teamRefSelect, toLeagueRef, toTeamRef } from "../shared/dto";
import { ageFrom } from "../teams/teams.service";
import { toPlayerMatchStats } from "../matches/matches.service";
import { tm } from "../../integrations/transfermarkt/client";
import { parseValueHistory, type TmValuePoint } from "../../integrations/transfermarkt/parse";

const log = createLogger("players");

async function requirePlayer(slug: string) {
  const player = await prisma.player.findUnique({ where: { slug }, include: { team: { select: teamRefSelect } } });
  if (!player) throw notFound("Player");
  return player;
}

export async function getPlayer(slug: string, lang: Lang) {
  const p = await requirePlayer(slug);
  const [standing, rating] = await Promise.all([
    prisma.standing.findFirst({
      where: { teamId: p.teamId, season: { isCurrent: true } },
      select: { season: { select: { year: true, league: true } } },
    }),
    prisma.playerMatchStat.aggregate({
      where: { playerId: p.id, rating: { not: null }, match: { season: { isCurrent: true }, status: "FINISHED" } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);
  return {
    id: p.id,
    slug: p.slug,
    name: localized(p.name, p.nameEn, lang),
    photoUrl: p.photoUrl,
    position: p.position,
    number: p.number,
    nationality: countryName(p.nationalityCode, p.nationality, lang),
    nationalityCode: p.nationalityCode,
    birthDate: p.birthDate?.toISOString() ?? null,
    age: ageFrom(p.birthDate),
    isActive: p.isActive,
    team: toTeamRef(p.team, lang),
    league: standing ? toLeagueRef(standing.season.league, lang) : null,
    seasonYear: standing?.season.year ?? null,
    season: {
      appearances: p.appearances,
      minutesPlayed: p.minutesPlayed,
      goals: p.goals,
      assists: p.assists,
      yellowCards: p.yellowCards,
      redCards: p.redCards,
    },
    advancedStats: p.advancedStats ?? null,
    marketValue: p.marketValue,
    heightCm: p.heightCm,
    foot: p.foot,
    rating: rating._count.rating > 0 ? { average: Math.round((rating._avg.rating ?? 0) * 100) / 100, matches: rating._count.rating } : null,
    contractUntil: p.contractUntil?.toISOString().slice(0, 10) ?? null,
    transfermarktUrl: p.tmId ? `https://www.transfermarkt.com/x/profil/spieler/${p.tmId}` : null,
  };
}

export async function getPlayerStats(slug: string, lang: Lang) {
  const player = await requirePlayer(slug);

  const lineups = await prisma.lineup.findMany({
    where: { playerId: player.id, match: { status: "FINISHED", season: { isCurrent: true } } },
    include: {
      match: {
        include: {
          homeTeam: { select: teamRefSelect },
          awayTeam: { select: teamRefSelect },
          events: {
            where: { OR: [{ playerId: player.id }, { relatedPlayerId: player.id }] },
            select: { type: true, minute: true, playerId: true, relatedPlayerId: true },
          },
          playerStats: { where: { playerId: player.id } },
        },
      },
    },
    orderBy: { match: { kickoff: "asc" } },
  });

  let cumulativeGoals = 0;
  const matchLog = lineups.map((l) => {
    const m = l.match;
    const isHome = m.homeTeamId === l.teamId;
    const mine = (type: string) => m.events.filter((e) => e.type === type && e.playerId === player.id);
    const goals = mine("GOAL").length + mine("PENALTY_GOAL").length;
    const assists = m.events.filter((e) => (e.type === "GOAL" || e.type === "PENALTY_GOAL") && e.relatedPlayerId === player.id).length;
    const subIn = m.events.find((e) => e.type === "SUBSTITUTION" && e.relatedPlayerId === player.id)?.minute;
    const subOut = m.events.find((e) => e.type === "SUBSTITUTION" && e.playerId === player.id)?.minute;
    const played = l.isStarting || subIn !== undefined;
    cumulativeGoals += goals;
    return {
      matchId: m.id,
      round: m.round,
      kickoff: m.kickoff.toISOString(),
      opponent: toTeamRef(isHome ? m.awayTeam : m.homeTeam, lang),
      isHome,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      started: l.isStarting,
      played,
      minutes: m.playerStats[0]?.minutes ?? (played ? Math.max(0, (subOut ?? 90) - (l.isStarting ? 0 : (subIn ?? 90))) : 0),
      rating: m.playerStats[0]?.rating ?? null,
      stats: toPlayerMatchStats(m.playerStats[0]),
      goals,
      assists,
      yellowCard: mine("YELLOW_CARD").length > 0,
      redCard: mine("RED_CARD").length + mine("SECOND_YELLOW").length > 0,
      cumulativeGoals,
    };
  });

  // Compare against same-position players of the same league who actually played.
  const seasonId = (
    await prisma.standing.findFirst({ where: { teamId: player.teamId, season: { isCurrent: true } }, select: { seasonId: true } })
  )?.seasonId;
  const peers = seasonId
    ? await prisma.player.findMany({
        where: { position: player.position, appearances: { gt: 0 }, team: { standings: { some: { seasonId } } } },
        select: { goals: true, assists: true, appearances: true, minutesPlayed: true, yellowCards: true, redCards: true },
      })
    : [];
  const metrics = (p: { goals: number; assists: number; appearances: number; minutesPlayed: number; yellowCards: number; redCards: number }) => ({
    goals: p.goals,
    assists: p.assists,
    appearances: p.appearances,
    minutesPlayed: p.minutesPlayed,
    cardPoints: p.yellowCards + p.redCards * 2,
  });
  type Metrics = ReturnType<typeof metrics>;
  const keys = ["goals", "assists", "appearances", "minutesPlayed", "cardPoints"] as const;
  const avg = {} as Metrics;
  const max = {} as Metrics;
  for (const k of keys) {
    const values = peers.map((p) => metrics(p)[k]);
    avg[k] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    max[k] = values.length ? Math.max(...values) : 0;
  }

  return {
    matchLog: matchLog.filter((m) => m.played),
    positionComparison: { sampleSize: peers.length, player: metrics(player), average: avg, max },
  };
}

// ---------- career (live from the source, cached) ----------

type Stint = { season: { season_id: number; year: number; league: LeagueConfig }; stat: PlayerSeasonStats };

// Season stats don't depend on the UI language, so they're cached once per player.
const stintsCache = new TtlCache<Stint[]>(6 * 60 * 60 * 1000, 1000);
const profileCache = new TtlCache<PlayerProfile | null>(24 * 60 * 60 * 1000, 1000);
const frontMapCache = new TtlCache<FrontMap>(6 * 60 * 60 * 1000, 1);
const teamInfoCache = new TtlCache<{ name: string; logoUrl: string | null } | null>(24 * 60 * 60 * 1000, 500);

/** "No stats for that season" is a normal answer; anything else is an outage and must not be cached. */
const nullOn404 = <T>(err: unknown): T | null => {
  if (err instanceof KffError && err.status === 404) return null;
  throw err;
};

async function externalTeamRef(externalId: number, lang: Lang) {
  const team = await prisma.team.findUnique({ where: { externalId }, select: teamRefSelect });
  if (team) return toTeamRef(team, lang);
  const info = await teamInfoCache
    .get(String(externalId), () =>
      kff
        .teamInfo(externalId)
        .then((t) => ({ name: t.name, logoUrl: t.logo_url }))
        .catch((err) => nullOn404<{ name: string; logoUrl: string | null }>(err)),
    )
    .catch(() => null);
  if (!info) return null;
  return { id: null, slug: null, name: localized(info.name, null, lang), logoUrl: info.logoUrl, color: teamColor(info.name) };
}

async function loadStints(externalPlayerId: number): Promise<Stint[]> {
  const frontMap = await frontMapCache.get("front-map", () => kff.frontMap());
  const seasons = [...LEAGUE_BY_CODE.values()].flatMap((league) =>
    (frontMap.items[league.code]?.seasons ?? []).map((s) => ({ season_id: s.season_id, year: s.year, league })),
  );
  // If any season fails for a reason other than "no data", the whole load fails:
  // a partial career must never be cached as if it were complete.
  const results = await Promise.all(
    seasons.map(async (season) => {
      const stat = await kff.playerSeasonStats(externalPlayerId, season.season_id).catch((err) => nullOn404<PlayerSeasonStats>(err));
      return stat && stat.games_played > 0 ? { season, stat } : null;
    }),
  );
  return results.filter((s): s is NonNullable<typeof s> => s !== null).sort((a, b) => b.season.year - a.season.year);
}

export async function getPlayerCareer(slug: string, lang: Lang) {
  const player = await prisma.player.findUnique({ where: { slug }, select: { externalId: true } });
  if (!player) throw notFound("Player");
  const id = player.externalId;

  let stints: Stint[];
  try {
    stints = await stintsCache.get(String(id), () => loadStints(id));
  } catch (err) {
    log.warn(`career for player ${id} unavailable`, err);
    throw new HttpError(502, "UPSTREAM_UNAVAILABLE", "Career data is temporarily unavailable");
  }
  // The bio is a nice-to-have: an outage just leaves it out (and isn't cached).
  const profile = await profileCache
    .get(`${id}:${lang}`, () => kff.playerProfile(id, lang).catch((err) => nullOn404<PlayerProfile>(err)))
    .catch(() => null);

  const career = await Promise.all(
    stints.map(async ({ season, stat }) => ({
      year: season.year,
      league: { slug: season.league.slug, name: lang === "en" ? season.league.nameEn : season.league.name, tier: season.league.tier },
      team: await externalTeamRef(stat.team_id, lang),
      appearances: stat.games_played,
      starts: stat.games_starting ?? null,
      minutesPlayed: stat.time_on_field_total ?? null,
      goals: stat.goal ?? 0,
      assists: stat.goal_pass ?? 0,
      yellowCards: stat.yellow_cards ?? 0,
      redCards: stat.red_cards ?? 0,
    })),
  );

  return {
    bio: profile
      ? {
          role: profile.top_role,
          heightCm: profile.height || null,
          weightKg: profile.weight || null,
          jerseyNumber: profile.jersey_number,
          contractEnd: profile.contract_end,
        }
      : null,
    career,
  };
}

// ---------- market value history (Transfermarkt, cached) ----------

const valueCache = new TtlCache<TmValuePoint[]>(24 * 60 * 60 * 1000, 500);

export async function getMarketValueHistory(slug: string) {
  const player = await prisma.player.findUnique({ where: { slug }, select: { tmId: true, marketValue: true } });
  if (!player) throw notFound("Player");
  if (!player.tmId) return { current: player.marketValue, highest: null, points: [] };
  const tmId = player.tmId;
  try {
    const points = await valueCache.get(String(tmId), async () => parseValueHistory(await tm.valueHistory(tmId)));
    const highest = points.reduce<TmValuePoint | null>((best, p) => (!best || p.value > best.value ? p : best), null);
    return { current: player.marketValue ?? points[points.length - 1]?.value ?? null, highest, points };
  } catch (err) {
    log.warn(`market value history for tm ${tmId} unavailable`, err);
    throw new HttpError(502, "UPSTREAM_UNAVAILABLE", "Market value history is temporarily unavailable");
  }
}
