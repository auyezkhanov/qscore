import type { Position, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createLogger } from "../lib/logger";
import { slugify, uniqueSlug } from "../lib/slug";
import { kff, sleep } from "../integrations/kff/client";
import { buildAdvancedStats, countryCode, fullName, mapPosition } from "../integrations/kff/mappers";
import type { PlayerStatRow, RosterPlayer } from "../integrations/kff/types";
import { REQUEST_GAP_MS } from "./config";
import type { TeamIdMap } from "./teams";

const log = createLogger("sync:players");

/** external player id -> our player id */
export type PlayerIdMap = Map<number, string>;

export async function loadPlayerIdMap(): Promise<PlayerIdMap> {
  const players = await prisma.player.findMany({ select: { id: true, externalId: true } });
  return new Map(players.map((p) => [p.externalId, p.id]));
}

export type NewPlayer = {
  externalId: number;
  name: string;
  nameEn: string | null;
  position: Position;
  teamId: string;
  number?: number | null;
  nationalityCode?: string | null;
  nationality?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
};

const isSlugTaken = async (slug: string) => !!(await prisma.player.findUnique({ where: { slug }, select: { id: true } }));

/** Creates a player, retrying with the next slug if a concurrent writer took ours. */
async function createPlayer(data: Omit<Prisma.PlayerUncheckedCreateInput, "slug">, slugBase: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await uniqueSlug(slugBase, isSlugTaken);
    try {
      return (await prisma.player.create({ data: { ...data, slug }, select: { id: true } })).id;
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
      // Unique clash: either the slug (retry) or the external id (someone created the player).
      const existing = await prisma.player.findUnique({ where: { externalId: data.externalId }, select: { id: true } });
      if (existing) return existing.id;
    }
  }
  throw new Error(`could not create player ${data.externalId}`);
}

/** Returns our id for an external player, creating a minimal record when unknown. */
export async function ensurePlayer(p: NewPlayer, ids: PlayerIdMap): Promise<string> {
  const known = ids.get(p.externalId);
  if (known) return known;

  const existing = await prisma.player.findUnique({ where: { externalId: p.externalId }, select: { id: true } });
  if (existing) {
    ids.set(p.externalId, existing.id);
    return existing.id;
  }

  const id = await createPlayer(
    {
      externalId: p.externalId,
      name: p.name,
      nameEn: p.nameEn,
      position: p.position,
      number: p.number ?? null,
      nationalityCode: p.nationalityCode ?? null,
      nationality: p.nationality ?? null,
      photoUrl: p.photoUrl ?? null,
      isActive: p.isActive ?? false,
      teamId: p.teamId,
    },
    slugify(p.nameEn || p.name),
  );
  ids.set(p.externalId, id);
  return id;
}

function enNameMap(rows: { id: number; first_name: string; last_name: string }[]) {
  return new Map(rows.map((r) => [r.id, fullName(r.first_name, r.last_name)]));
}

/**
 * Syncs one club's players for one league season.
 *
 * - The roster endpoint is the authoritative "at the club now" list: only it
 *   may move a player to this club (`teamId`) and mark him active.
 * - The season-stats list also contains players who have since left; their
 *   numbers are stored per (player, season, club) without touching which club
 *   they currently belong to — otherwise the last-synced club would "steal"
 *   every player who ever played for it.
 */
async function syncTeamPlayers(seasonId: string, seasonExtId: number, teamExtId: number, teamId: string, ids: PlayerIdMap) {
  const [statsRu, statsEn, rosterRu, rosterEn] = await Promise.all([
    kff.teamPlayerStats(seasonExtId, teamExtId, "ru"),
    kff.teamPlayerStats(seasonExtId, teamExtId, "en"),
    kff.teamRoster(seasonExtId, teamExtId, "ru"),
    kff.teamRoster(seasonExtId, teamExtId, "en"),
  ]);

  if (statsRu.items.length === 0 && rosterRu.items.length === 0) {
    // An empty answer is far more likely a source glitch than a club with no players.
    log.warn(`club ${teamExtId}: source returned no players, keeping existing data`);
    return;
  }

  const stats = new Map<number, PlayerStatRow>(statsRu.items.map((s) => [s.player_id, s]));
  const roster = new Map<number, RosterPlayer>(rosterRu.items.map((r) => [r.id, r]));
  const namesEn = new Map([
    ...enNameMap(statsEn.items.map((s) => ({ id: s.player_id, first_name: s.first_name, last_name: s.last_name }))),
    ...enNameMap(rosterEn.items),
  ]);

  const onRoster: string[] = [];
  for (const externalId of new Set([...stats.keys(), ...roster.keys()])) {
    const stat = stats.get(externalId);
    const member = roster.get(externalId);
    const source = member ?? stat!;
    const country = member?.country ?? stat?.country ?? null;

    const identity = {
      name: fullName(source.first_name, source.last_name),
      nameEn: namesEn.get(externalId) || null,
      position: mapPosition(stat?.position_code ?? member?.position, stat?.player_type ?? member?.player_type),
      nationalityCode: countryCode(country),
      nationality: country?.name ?? null,
      ...(member?.birthday ? { birthDate: new Date(member.birthday) } : {}),
      ...((member?.photo_url_avatar ?? stat?.photo_url_avatar ?? member?.photo_url ?? stat?.photo_url)
        ? { photoUrl: member?.photo_url_avatar ?? stat?.photo_url_avatar ?? member?.photo_url ?? stat?.photo_url }
        : {}),
    };
    // Club membership only from the roster.
    const membership = member ? { teamId, isActive: true, number: member.number ?? null } : {};

    let playerId = ids.get(externalId) ?? (await prisma.player.findUnique({ where: { externalId }, select: { id: true } }))?.id;
    if (playerId) {
      await prisma.player.update({ where: { id: playerId }, data: { ...identity, ...membership } });
    } else {
      playerId = await createPlayer(
        { externalId, ...identity, teamId, isActive: !!member, number: member?.number ?? null },
        slugify(identity.nameEn || identity.name),
      );
    }
    ids.set(externalId, playerId);
    if (member) onRoster.push(playerId);

    const seasonStats = {
      onRoster: !!member,
      goals: stat?.goal ?? 0,
      assists: stat?.goal_pass ?? 0,
      yellowCards: stat?.yellow_cards ?? 0,
      redCards: stat?.red_cards ?? 0,
      appearances: stat?.games_played ?? 0,
      minutesPlayed: stat?.time_on_field_total ?? 0,
      advancedStats: stat ? (buildAdvancedStats(stat) as Prisma.InputJsonValue) : undefined,
    };
    await prisma.playerSeasonStat.upsert({
      where: { playerId_seasonId_teamId: { playerId, seasonId, teamId } },
      create: { playerId, seasonId, teamId, ...seasonStats },
      update: seasonStats,
    });
  }

  // Players still attached to this club but no longer on its roster have left.
  if (rosterRu.items.length > 0) {
    await prisma.player.updateMany({ where: { teamId, isActive: true, id: { notIn: onRoster } }, data: { isActive: false } });
    await prisma.playerSeasonStat.updateMany({ where: { teamId, seasonId, playerId: { notIn: onRoster } }, data: { onRoster: false } });
  }
}

export async function syncRosters(seasonId: string, seasonExtId: number, teamExtIds: number[], teamIds: TeamIdMap, ids: PlayerIdMap) {
  for (const teamExtId of teamExtIds) {
    const teamId = teamIds.get(teamExtId);
    if (!teamId) continue;
    await syncTeamPlayers(seasonId, seasonExtId, teamExtId, teamId, ids);
    await sleep(REQUEST_GAP_MS);
  }
}

/**
 * Copies each player's numbers for his current club in that club's current
 * season onto the player row (what squads and the player page show). Runs
 * after all leagues are synced so the final club assignment is used.
 */
export async function refreshPlayerCounters() {
  await prisma.$executeRaw`
    UPDATE "Player" p SET
      "goals" = COALESCE(s."goals", 0),
      "assists" = COALESCE(s."assists", 0),
      "yellowCards" = COALESCE(s."yellowCards", 0),
      "redCards" = COALESCE(s."redCards", 0),
      "appearances" = COALESCE(s."appearances", 0),
      "minutesPlayed" = COALESCE(s."minutesPlayed", 0),
      "advancedStats" = s."advancedStats"
    FROM "Player" p2
    LEFT JOIN LATERAL (
      SELECT ps.* FROM "PlayerSeasonStat" ps
      JOIN "Season" se ON se.id = ps."seasonId" AND se."isCurrent"
      WHERE ps."playerId" = p2.id AND ps."teamId" = p2."teamId"
      ORDER BY ps."appearances" DESC
      LIMIT 1
    ) s ON TRUE
    WHERE p.id = p2.id`;
}
