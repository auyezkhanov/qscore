import { prisma } from "../lib/prisma";
import { slugify, uniqueSlug } from "../lib/slug";
import { normalizeForm, teamColor } from "../integrations/kff/mappers";
import { createLogger } from "../lib/logger";

const log = createLogger("sync:teams");
import type { Game, TableRow } from "../integrations/kff/types";

/** external team id -> our team id */
export type TeamIdMap = Map<number, string>;

export async function loadTeamIdMap(): Promise<TeamIdMap> {
  const teams = await prisma.team.findMany({ select: { id: true, externalId: true } });
  return new Map(teams.map((t) => [t.externalId, t.id]));
}

async function upsertTeam(externalId: number, name: string, nameEn: string | null, logoUrl: string | null) {
  const existing = await prisma.team.findUnique({ where: { externalId }, select: { id: true } });
  if (existing) {
    await prisma.team.update({
      where: { id: existing.id },
      data: { name, ...(nameEn ? { nameEn } : {}), ...(logoUrl ? { logoUrl } : {}) },
    });
    return existing.id;
  }
  const slug = await uniqueSlug(slugify(nameEn || name), async (s) => !!(await prisma.team.findUnique({ where: { slug: s } })));
  const created = await prisma.team.create({
    data: { externalId, slug, name, nameEn, logoUrl, primaryColor: teamColor(name) },
  });
  return created.id;
}

/** Upserts every team in a league table (Russian + English rows) and its standings. */
export async function syncTable(seasonId: string, rowsRu: TableRow[], rowsEn: TableRow[], teamIds: TeamIdMap) {
  if (rowsRu.length === 0) {
    // An empty table from the source is a glitch, not a season with no clubs.
    log.warn(`season ${seasonId}: source returned an empty table, keeping the current standings`);
    return;
  }
  const enById = new Map(rowsEn.map((r) => [r.team_id, r]));

  for (const row of rowsRu) {
    const teamId = await upsertTeam(row.team_id, row.team_name, enById.get(row.team_id)?.team_name ?? null, row.team_logo);
    teamIds.set(row.team_id, teamId);

    const data = {
      position: row.position,
      played: row.games_played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      goalsFor: row.goals_scored,
      goalsAgainst: row.goals_conceded,
      points: row.points,
      form: normalizeForm(row.form),
      zone: row.zone,
    };
    await prisma.standing.upsert({
      where: { seasonId_teamId: { seasonId, teamId } },
      create: { seasonId, teamId, ...data },
      update: data,
    });
  }

  // Drop rows for teams that are no longer part of this season's table.
  const current = rowsRu.map((r) => teamIds.get(r.team_id)).filter((id): id is string => !!id);
  await prisma.standing.deleteMany({ where: { seasonId, teamId: { notIn: current } } });
}

/** Makes sure both sides of every fixture exist (cup/playoff opponents may be missing from the table). */
export async function ensureGameTeams(games: Game[], teamIds: TeamIdMap) {
  for (const g of games) {
    for (const t of [g.home_team, g.away_team]) {
      if (teamIds.has(t.id)) {
        if (t.name_en) await prisma.team.updateMany({ where: { externalId: t.id, nameEn: null }, data: { nameEn: t.name_en } });
        continue;
      }
      teamIds.set(t.id, await upsertTeam(t.id, t.name, t.name_en ?? null, t.logo_url));
    }
  }
}

/** Derives each club's home ground/city from where it hosts most of its fixtures. */
export async function syncHomeGrounds(games: Game[], teamIds: TeamIdMap) {
  type Ground = { name: string; nameEn: string | null; city: string | null; capacity: number | null; surface: string | null };
  const counts = new Map<string, Map<string, { ground: Ground; n: number }>>();

  for (const g of games) {
    const teamId = teamIds.get(g.home_team.id);
    const s = g.stadium;
    if (!teamId || !s?.name) continue;
    const byName = counts.get(teamId) ?? new Map();
    const prev = byName.get(s.name);
    byName.set(s.name, {
      ground: {
        name: s.name,
        nameEn: s.name_en ?? null,
        city: s.city ?? null,
        capacity: s.capacity ?? prev?.ground.capacity ?? null,
        surface: s.field_type ?? prev?.ground.surface ?? null,
      },
      n: (prev?.n ?? 0) + 1,
    });
    counts.set(teamId, byName);
  }

  for (const [teamId, byName] of counts) {
    const best = [...byName.values()].sort((a, b) => b.n - a.n)[0]?.ground;
    if (!best) continue;
    await prisma.team.update({
      where: { id: teamId },
      data: {
        stadium: best.name,
        stadiumEn: best.nameEn,
        city: best.city,
        ...(best.capacity ? { stadiumCapacity: best.capacity } : {}),
        ...(best.surface ? { stadiumSurface: best.surface } : {}),
      },
    });
  }
}
