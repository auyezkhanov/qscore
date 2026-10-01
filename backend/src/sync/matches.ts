import { safeUrl } from "../lib/url";
import type { EventType, MatchStatus, Position, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createLogger } from "../lib/logger";
import { computeRating } from "../lib/rating";
import { kff } from "../integrations/kff/client";
import {
  countryCode,
  fullName,
  lineupGrid,
  mapEventType,
  mapGameStatus,
  mapPosition,
  parseKickoff,
  splitMinute,
} from "../integrations/kff/mappers";
import { headCoach, mapAbsences, mapBroadcasters, mapOfficials, mapPlayerMatchStat } from "../integrations/kff/matchMappers";
import type { Game, GameLineup, LineupPlayerEntry, MatchEventRaw } from "../integrations/kff/types";
import { ensurePlayer, type PlayerIdMap } from "./players";
import type { TeamIdMap } from "./teams";

const log = createLogger("sync:matches");

/**
 * Version of what a detail sync stores. Bump it when syncMatchDetail starts
 * saving something new: the next full sync re-pulls every finished match below it.
 */
export const DETAILS_VERSION = 3;

export type UpsertedGame = {
  game: Game;
  matchId: string;
  statusChanged: boolean;
  previous: { status: MatchStatus; homeScore: number | null; awayScore: number | null } | null;
};

const SCHEDULE_FIELDS = {
  seasonId: true,
  round: true,
  homeTeamId: true,
  awayTeamId: true,
  kickoff: true,
  timeTbd: true,
  homeScore: true,
  awayScore: true,
  homePenaltyScore: true,
  awayPenaltyScore: true,
  status: true,
  minute: true,
  stadium: true,
  stadiumEn: true,
  city: true,
  attendance: true,
  youtubeUrl: true,
  highlightsUrl: true,
  broadcasters: true,
} as const satisfies Prisma.MatchSelect;

// jsonb doesn't preserve key order, so objects are compared with sorted keys.
const stableJson = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stableJson).join(",")}]`
    : v !== null && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`)
          .join(",")}}`
      : JSON.stringify(v ?? null);

const comparable = (v: unknown) => (v instanceof Date ? v.getTime() : v !== null && typeof v === "object" ? stableJson(v) : v);

/** Whether any field we'd write differs from what's stored. */
export function scheduleChanged(stored: Record<string, unknown>, next: Record<string, unknown>): boolean {
  return Object.entries(next).some(([key, value]) => comparable(stored[key]) !== comparable(value));
}

/** Upserts schedule rows (score/status/minute/venue/broadcasters) for a season's fixtures. */
export async function upsertGames(seasonId: string, games: Game[], teamIds: TeamIdMap): Promise<UpsertedGame[]> {
  const previous = new Map(
    (
      await prisma.match.findMany({
        where: { externalId: { in: games.map((g) => g.id) } },
        select: { id: true, externalId: true, ...SCHEDULE_FIELDS },
      })
    ).map((m) => [m.externalId, m]),
  );

  const result: UpsertedGame[] = [];
  for (const g of games) {
    const homeTeamId = teamIds.get(g.home_team.id);
    const awayTeamId = teamIds.get(g.away_team.id);
    const when = parseKickoff(g.date, g.time);
    if (!homeTeamId || !awayTeamId || !when) {
      log.warn(`skipping game ${g.id}: unknown team or bad date "${g.date} ${g.time}"`);
      continue;
    }
    const { status, minute } = mapGameStatus(g);
    const broadcasters = mapBroadcasters(g.broadcasters);
    const data = {
      seasonId,
      round: g.tour ?? 0,
      homeTeamId,
      awayTeamId,
      kickoff: when.kickoff,
      timeTbd: when.timeTbd || !!g.is_schedule_tentative,
      homeScore: g.home_score,
      awayScore: g.away_score,
      homePenaltyScore: g.home_penalty_score ?? null,
      awayPenaltyScore: g.away_penalty_score ?? null,
      status,
      minute,
      stadium: g.stadium?.name ?? null,
      stadiumEn: g.stadium?.name_en ?? null,
      city: g.stadium?.city ?? null,
      attendance: g.visitors ?? null,
      ...(safeUrl(g.youtube_live_url) ? { youtubeUrl: safeUrl(g.youtube_live_url) } : {}),
      ...(safeUrl(g.video_review_url) ? { highlightsUrl: safeUrl(g.video_review_url) } : {}),
      ...(broadcasters.length > 0 ? { broadcasters: broadcasters as Prisma.InputJsonValue } : {}),
    };
    const prev = previous.get(g.id) ?? null;
    // Most fixtures don't change between syncs; skipping no-op writes keeps updatedAt
    // meaningful (calendar DTSTAMP) and the full sync cheap.
    const match =
      prev && !scheduleChanged(prev, data)
        ? { id: prev.id }
        : await prisma.match.upsert({
            where: { externalId: g.id },
            create: { externalId: g.id, ...data },
            update: data,
            select: { id: true },
          });
    result.push({
      game: g,
      matchId: match.id,
      statusChanged: prev?.status !== status,
      previous: prev ? { status: prev.status, homeScore: prev.homeScore, awayScore: prev.awayScore } : null,
    });
  }
  return result;
}

/** Whether a fixture has data worth pulling from the detail endpoints. */
export function hasDetailData(g: Game): boolean {
  if (g.is_live) return true;
  const finished = g.status === "finished" || g.status === "technical_defeat";
  return finished && (g.has_lineup || g.has_stats);
}

type Side = { teamId: string; byNumber: Map<number, string> };

function eventKey(e: MatchEventRaw) {
  return `${e.event_type}|${e.team_id}|${e.player_id ?? e.player_number}|${e.player2_id ?? e.player2_number}`;
}

type LineupBundle = {
  rows: Prisma.LineupCreateManyInput[];
  sides: Map<number, Side>;
  teamOfPlayer: Map<string, string>;
  positionOfPlayer: Map<string, Position>;
  startedPlayers: Set<string>;
  match: Prisma.MatchUpdateInput;
};

/**
 * Lineups plus the extras the lineup endpoint carries (coaches, officials,
 * suspensions). Missing players are created; that is idempotent, so it runs
 * outside the transaction that swaps the match data.
 */
async function loadLineup(externalGameId: number, matchId: string, teamIds: TeamIdMap, playerIds: PlayerIdMap): Promise<LineupBundle> {
  const [ru, en] = await Promise.all([
    kff.gameLineup(externalGameId, "ru"),
    kff.gameLineup(externalGameId, "en").catch((): GameLineup | null => null),
  ]);

  const enNames = new Map<number, string>();
  for (const side of [en?.lineups?.home_team, en?.lineups?.away_team]) {
    for (const p of [...(side?.starters ?? []), ...(side?.substitutes ?? [])]) enNames.set(p.player_id, fullName(p.first_name, p.last_name));
  }

  const bundle: LineupBundle = {
    rows: [],
    sides: new Map(),
    teamOfPlayer: new Map(),
    positionOfPlayer: new Map(),
    startedPlayers: new Set(),
    match: {},
  };

  const home = headCoach(ru.coaches?.home_team, en?.coaches?.home_team);
  const away = headCoach(ru.coaches?.away_team, en?.coaches?.away_team);
  const officials = mapOfficials(ru.referees, en?.referees);
  bundle.match = {
    ...(home ? { homeCoach: home.name, homeCoachEn: home.nameEn } : {}),
    ...(away ? { awayCoach: away.name, awayCoachEn: away.nameEn } : {}),
    ...(officials.length > 0 ? { officials: officials as Prisma.InputJsonValue } : {}),
    absences: mapAbsences(ru.suspensions, en?.suspensions) as Prisma.InputJsonValue,
  };

  if (!ru.lineups) return bundle;

  for (const [key, side] of [
    ["home", ru.lineups.home_team],
    ["away", ru.lineups.away_team],
  ] as const) {
    const teamId = teamIds.get(side.team_id);
    if (!teamId) continue;
    bundle.match[key === "home" ? "homeFormation" : "awayFormation"] = side.formation;
    const byNumber = new Map<number, string>();
    const seen = new Set<string>();

    const entries: [LineupPlayerEntry, boolean][] = [
      ...side.starters.map((p): [LineupPlayerEntry, boolean] => [p, true]),
      ...side.substitutes.map((p): [LineupPlayerEntry, boolean] => [p, false]),
    ];
    for (const [p, starting] of entries) {
      const position: Position = mapPosition(null, null, p.amplua);
      const playerId = await ensurePlayer(
        {
          externalId: p.player_id,
          name: fullName(p.first_name, p.last_name),
          nameEn: enNames.get(p.player_id) ?? null,
          position,
          teamId,
          number: p.shirt_number,
          nationalityCode: countryCode(p.country),
          nationality: p.country?.name ?? null,
          photoUrl: p.photo_url,
        },
        playerIds,
      );
      if (seen.has(playerId)) continue;
      seen.add(playerId);
      if (p.shirt_number != null) byNumber.set(p.shirt_number, playerId);
      bundle.teamOfPlayer.set(playerId, teamId);
      if (p.amplua) bundle.positionOfPlayer.set(playerId, position);
      if (starting) bundle.startedPlayers.add(playerId);
      const grid = starting ? lineupGrid(p.amplua, p.field_position) : null;
      bundle.rows.push({
        matchId,
        teamId,
        playerId,
        isStarting: starting,
        isCaptain: p.is_captain,
        position: starting || p.amplua ? position : null,
        shirtNumber: p.shirt_number,
        gridX: grid?.x ?? null,
        gridY: grid?.y ?? null,
      });
    }
    bundle.sides.set(side.team_id, { teamId, byNumber });
  }
  return bundle;
}

/**
 * Re-pulls lineups, events, team stats and per-player stats (with ratings)
 * for one match and swaps them in a single transaction, so readers never see
 * a half-written match.
 */
export async function syncMatchDetail(externalGameId: number, matchId: string, teamIds: TeamIdMap, playerIds: PlayerIdMap) {
  const [detail, stats, lineup, match] = await Promise.all([
    kff.gameDetail(externalGameId),
    kff.gameStats(externalGameId),
    loadLineup(externalGameId, matchId, teamIds, playerIds),
    prisma.match.findUniqueOrThrow({ where: { id: matchId }, select: { homeTeamId: true, homeScore: true, awayScore: true } }),
  ]);

  // --- events ---
  const resolve = (teamExtId: number, externalId: number | null, number: number | null): string | null => {
    if (externalId != null && playerIds.has(externalId)) return playerIds.get(externalId)!;
    if (number != null) return lineup.sides.get(teamExtId)?.byNumber.get(number) ?? null;
    return null;
  };

  const eventRows: Prisma.MatchEventCreateManyInput[] = [];
  const seenEvents = new Set<string>();
  for (const e of [...stats.events].sort((a, b) => a.minute - b.minute || a.id - b.id)) {
    const type: EventType | null = mapEventType(e.event_type);
    const teamId = teamIds.get(e.team_id);
    if (!type || !teamId) continue;
    // The source occasionally repeats the same substitution a couple of minutes apart.
    if (type === "SUBSTITUTION") {
      const key = eventKey(e);
      if (seenEvents.has(key)) continue;
      seenEvents.add(key);
    }

    const playerId = resolve(e.team_id, e.player_id, e.player_number);
    let relatedPlayerId: string | null = null;
    let relatedPlayerName: string | null = null;
    if (type === "SUBSTITUTION" || type === "GOAL" || type === "PENALTY_GOAL") {
      relatedPlayerId = resolve(e.team_id, e.player2_id, e.player2_number);
      relatedPlayerName = e.player2_name || null;
      // For goals the second player is meant to be the assist, but the source
      // sometimes puts the opposing goalkeeper there — only keep teammates.
      if (type !== "SUBSTITUTION") {
        const sameTeam = relatedPlayerId ? lineup.teamOfPlayer.get(relatedPlayerId) === teamId : false;
        if (!sameTeam || relatedPlayerId === playerId) {
          relatedPlayerId = null;
          relatedPlayerName = null;
        }
      }
    }

    const { minute, addedTime } = splitMinute(e.minute, e.half);
    eventRows.push({
      externalId: e.id,
      matchId,
      type,
      minute,
      addedTime,
      teamId,
      playerId,
      playerName: e.player_name || null,
      relatedPlayerId,
      relatedPlayerName,
    });
  }

  // --- team stats ---
  const statRows: Prisma.MatchStatCreateManyInput[] = [];
  for (const s of stats.team_stats) {
    const teamId = teamIds.get(s.team_id);
    if (!teamId) continue;
    statRows.push({
      matchId,
      teamId,
      possession: Math.round(s.possession_percent ?? 50),
      shots: s.shots ?? 0,
      shotsOnTarget: s.shots_on_goal ?? 0,
      corners: s.corners ?? 0,
      fouls: s.fouls ?? 0,
      offsides: s.offsides ?? 0,
      yellowCards: s.yellow_cards ?? 0,
      redCards: s.red_cards ?? 0,
      passes: s.passes ?? 0,
      passAccuracy: Math.round(s.pass_accuracy ?? 0),
      saves: s.saves ?? null,
      xg: s.xg ?? null,
      keyPasses: s.key_passes ?? null,
      crosses: s.crosses ?? null,
      shotsBlocked: s.shots_blocked ?? null,
      shotsOnBar: s.shots_on_bar ?? null,
      freekicks: s.freekicks ?? null,
      throwIns: s.throw_ins ?? null,
      passesToFinalThird: s.passes_to_final_third ?? null,
      passesProgressive: s.passes_progressive ?? null,
    });
  }

  // --- per-player stats + ratings ---
  // Goals/assists/own goals come from the event feed: the per-player feed
  // sometimes leaves penalties out of a scorer's goal count.
  const penaltiesMissed = new Map<string, number>();
  const eventGoals = new Map<string, number>();
  const eventAssists = new Map<string, number>();
  const eventOwnGoals = new Map<string, number>();
  const bump = (m: Map<string, number>, id: string | null | undefined) => id && m.set(id, (m.get(id) ?? 0) + 1);
  for (const e of eventRows) {
    if (e.type === "PENALTY_MISSED") bump(penaltiesMissed, e.playerId);
    else if (e.type === "GOAL" || e.type === "PENALTY_GOAL") {
      bump(eventGoals, e.playerId);
      bump(eventAssists, e.relatedPlayerId);
    } else if (e.type === "OWN_GOAL") bump(eventOwnGoals, e.playerId);
  }
  const hasGoalEvents = eventRows.some((e) => e.type === "GOAL" || e.type === "PENALTY_GOAL" || e.type === "OWN_GOAL");
  const playerRows: Prisma.PlayerMatchStatCreateManyInput[] = [];
  const positions = new Map(
    (
      await prisma.player.findMany({
        where: { id: { in: [...(stats.player_stats ?? [])].map((p) => playerIds.get(p.player_id)).filter((id): id is string => !!id) } },
        select: { id: true, position: true },
      })
    ).map((p) => [p.id, p.position]),
  );
  const seenPlayers = new Set<string>();
  for (const raw of stats.player_stats ?? []) {
    const playerId = playerIds.get(raw.player_id);
    const teamId = teamIds.get(raw.team_id);
    if (!playerId || !teamId || seenPlayers.has(playerId)) continue;
    const s = mapPlayerMatchStat(raw);
    if (s.minutes <= 0) continue;
    if (hasGoalEvents || match.homeScore === 0 && match.awayScore === 0) {
      s.goals = eventGoals.get(playerId) ?? 0;
      s.assists = Math.max(eventAssists.get(playerId) ?? 0, s.assists);
      s.ownGoals = eventOwnGoals.get(playerId) ?? 0;
    }
    seenPlayers.add(playerId);

    const isHome = teamId === match.homeTeamId;
    const goalsFor = (isHome ? match.homeScore : match.awayScore) ?? 0;
    const goalsAgainst = (isHome ? match.awayScore : match.homeScore) ?? 0;
    const position = lineup.positionOfPlayer.get(playerId) ?? positions.get(playerId) ?? "MF";
    const rating = computeRating({
      ...s,
      position,
      teamConceded: goalsAgainst,
      penaltiesMissed: penaltiesMissed.get(playerId) ?? 0,
      result: goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D",
    });
    playerRows.push({ matchId, playerId, teamId, started: lineup.startedPlayers.has(playerId), rating, ...s });
  }

  await prisma.$transaction([
    prisma.lineup.deleteMany({ where: { matchId } }),
    prisma.matchEvent.deleteMany({ where: { matchId } }),
    prisma.matchStat.deleteMany({ where: { matchId } }),
    prisma.playerMatchStat.deleteMany({ where: { matchId } }),
    prisma.lineup.createMany({ data: lineup.rows }),
    prisma.matchEvent.createMany({ data: eventRows }),
    prisma.matchStat.createMany({ data: statRows }),
    prisma.playerMatchStat.createMany({ data: playerRows }),
    prisma.match.update({
      where: { id: matchId },
      data: {
        ...lineup.match,
        referee: detail.referee || null,
        ...(safeUrl(detail.youtube_live_url) ? { youtubeUrl: safeUrl(detail.youtube_live_url) } : {}),
        ...(detail.video_review_url ? { highlightsUrl: detail.video_review_url } : {}),
        hasDetails: lineup.rows.length > 0 || eventRows.length > 0 || statRows.length > 0,
        detailsSyncedAt: new Date(),
        detailsVersion: DETAILS_VERSION,
      },
    }),
  ]);
}

/**
 * Before kick-off: coaches, suspensions, officials and — once announced —
 * the lineups. Never touches events or stats.
 */
export async function syncMatchPreview(externalGameId: number, matchId: string, teamIds: TeamIdMap, playerIds: PlayerIdMap) {
  const lineup = await loadLineup(externalGameId, matchId, teamIds, playerIds);
  await prisma.$transaction([
    ...(lineup.rows.length > 0
      ? [prisma.lineup.deleteMany({ where: { matchId } }), prisma.lineup.createMany({ data: lineup.rows })]
      : []),
    prisma.match.update({ where: { id: matchId }, data: { ...lineup.match, previewSyncedAt: new Date() } }),
  ]);
}
