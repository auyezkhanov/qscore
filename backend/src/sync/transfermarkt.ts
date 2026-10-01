import { prisma } from "../lib/prisma";
import { createLogger } from "../lib/logger";
import { nameSimilarity, nameTokens } from "../lib/names";
import { sleep } from "../integrations/kff/client";
import { tm, TM_REQUEST_GAP_MS } from "../integrations/transfermarkt/client";
import { TM_CLUBS, TM_COMPETITION, tmSeasonId } from "../integrations/transfermarkt/config";
import { mapTmPosition, parseLeagueTransfers, parseSquad, type TmSquadPlayer, type TmTransferRow } from "../integrations/transfermarkt/parse";
import { countryCodeFromEnglish } from "../lib/i18n";

const log = createLogger("sync:transfermarkt");

const dayKey = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const isFullName = (name: string) => nameTokens(name).length >= 2;

type Candidate = { tmId: number; ourId: string; score: number };

/** Greedy one-to-one assignment, best score first. */
function assign(candidates: Candidate[]): Map<number, string> {
  const result = new Map<number, string>();
  const taken = new Set<string>();
  for (const c of [...candidates].sort((a, b) => b.score - a.score)) {
    if (result.has(c.tmId) || taken.has(c.ourId)) continue;
    result.set(c.tmId, c.ourId);
    taken.add(c.ourId);
  }
  return result;
}

export type OurPlayer = { id: string; name: string; nameEn: string | null; birthDate: Date | null };

/**
 * Matches a Transfermarkt squad to our players of the same club. A shared date
 * of birth plus any name overlap is decisive; without a birth date on our side
 * only an exact full-name match counts.
 */
export function matchSquad(tmPlayers: TmSquadPlayer[], ours: OurPlayer[]): Map<number, string> {
  const candidates: Candidate[] = [];
  for (const t of tmPlayers) {
    for (const o of ours) {
      const sim = Math.max(nameSimilarity(t.name, o.nameEn ?? ""), nameSimilarity(t.name, o.name));
      const sameDob = !!t.birthDate && t.birthDate === dayKey(o.birthDate);
      if (sameDob && sim > 0) candidates.push({ tmId: t.tmPlayerId, ourId: o.id, score: 2 + sim });
      else if (sim >= 0.99 && isFullName(t.name) && isFullName(o.nameEn ?? o.name) && (!o.birthDate || !t.birthDate))
        candidates.push({ tmId: t.tmPlayerId, ourId: o.id, score: 1 + sim });
    }
  }
  return assign(candidates);
}

export type OurTransfer = { id: string; name: string; nameEn: string | null; age: number | null; playerTmId: number | null };

/** Matches Transfermarkt transfer rows to our transfers of the same club and direction. */
export function matchTransfers(rows: TmTransferRow[], ours: OurTransfer[]): Map<number, string> {
  const candidates: Candidate[] = [];
  rows.forEach((r, index) => {
    for (const o of ours) {
      if (o.playerTmId != null && o.playerTmId === r.tmPlayerId) {
        candidates.push({ tmId: index, ourId: o.id, score: 3 });
        continue;
      }
      const sim = Math.max(nameSimilarity(r.name, o.nameEn ?? ""), nameSimilarity(r.name, o.name));
      const ageClose = r.age != null && o.age != null && Math.abs(r.age - o.age) <= 1;
      if (sim >= 0.99 && isFullName(r.name) && isFullName(o.nameEn ?? o.name)) candidates.push({ tmId: index, ourId: o.id, score: 1.5 + sim + (ageClose ? 0.2 : 0) });
      else if (sim >= 0.5 && ageClose) candidates.push({ tmId: index, ourId: o.id, score: 1 + sim });
    }
  });
  return assign(candidates);
}

/**
 * Enriches KPL clubs, players and transfers with Transfermarkt market values,
 * contract ends and transfer fees. Only fills extra columns; everything else
 * keeps coming from kffleague.kz.
 */
export async function transfermarktSync() {
  const season = await prisma.season.findFirst({ where: { isCurrent: true, league: { slug: "kpl" } } });
  if (!season) {
    log.info("no current KPL season yet, skipping");
    return;
  }
  const tmSeason = tmSeasonId(season.year);
  const teams = await prisma.team.findMany({
    where: { externalId: { in: Object.values(TM_CLUBS).map((c) => c.kffTeamId) }, standings: { some: { seasonId: season.id } } },
    select: { id: true, externalId: true },
  });
  const teamByTmId = new Map<number, string>();
  for (const [tmId, club] of Object.entries(TM_CLUBS)) {
    const team = teams.find((t) => t.externalId === club.kffTeamId);
    if (team) teamByTmId.set(Number(tmId), team.id);
    else log.warn(`club "${club.name}" (tm ${tmId}) is not in the current KPL table`);
  }

  // --- squads: market values + contracts ---
  let matchedPlayers = 0;
  let squadPlayers = 0;
  for (const [tmClubId, teamId] of teamByTmId) {
    await sleep(TM_REQUEST_GAP_MS);
    const squad = parseSquad(await tm.squad(tmClubId, tmSeason));
    if (squad.length === 0) {
      // Empty parse = changed markup or a blocked page, not an empty squad: keep what we have.
      log.warn(`tm club ${tmClubId}: squad page parsed empty, skipping`);
      continue;
    }
    const ours = await prisma.player.findMany({ where: { teamId }, select: { id: true, name: true, nameEn: true, birthDate: true } });
    const matches = matchSquad(squad, ours);
    squadPlayers += squad.length;
    matchedPlayers += matches.size;

    const byTmId = new Map(squad.map((p) => [p.tmPlayerId, p]));
    const squadValue = squad.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
    await prisma.$transaction([
      prisma.team.updateMany({ where: { tmId: tmClubId, id: { not: teamId } }, data: { tmId: null } }),
      prisma.team.update({ where: { id: teamId }, data: { tmId: tmClubId, squadValue: squadValue || null } }),
      // Free up ids another record may still hold (e.g. after a mismatch was corrected).
      prisma.player.updateMany({
        where: { tmId: { in: [...matches.keys()] }, id: { notIn: [...matches.values()] } },
        data: { tmId: null },
      }),
      ...[...matches].map(([tmId, playerId]) => {
        const p = byTmId.get(tmId)!;
        return prisma.player.update({
          where: { id: playerId },
          data: {
            tmId,
            marketValue: p.marketValue,
            contractUntil: p.contractUntil ? new Date(`${p.contractUntil}T00:00:00Z`) : null,
            heightCm: p.heightCm,
            foot: p.foot,
          },
        });
      }),
    ]);
  }
  log.info(`squads: matched ${matchedPlayers}/${squadPlayers} players`);

  // --- transfers: fees ---
  await sleep(TM_REQUEST_GAP_MS);
  const clubs = parseLeagueTransfers(await tm.leagueTransfers(TM_COMPETITION, tmSeason));
  if (clubs.reduce((n, c) => n + c.arrivals.length + c.departures.length, 0) === 0) {
    throw new Error("Transfermarkt transfers page parsed empty (markup changed?) — keeping existing fees");
  }
  let matchedTransfers = 0;
  let addedTransfers = 0;
  let tmRows = 0;
  const playerByTmId = new Map(
    (await prisma.player.findMany({ where: { tmId: { not: null } }, select: { id: true, tmId: true } })).map((p) => [p.tmId!, p.id]),
  );

  for (const club of clubs) {
    const teamId = teamByTmId.get(club.tmClubId);
    if (!teamId) continue;
    for (const [direction, rows] of [
      ["IN", club.arrivals],
      ["OUT", club.departures],
    ] as const) {
      if (rows.length === 0) continue; // nothing parsed for this side: don't wipe what we have
      const group = { seasonId: season.id, teamId, direction };
      const kffTransfers = await prisma.transfer.findMany({
        where: { ...group, source: "kff" },
        select: { id: true, playerName: true, playerNameEn: true, playerAge: true, player: { select: { tmId: true } } },
      });
      const ours: OurTransfer[] = kffTransfers.map((t) => ({
        id: t.id,
        name: t.playerName,
        nameEn: t.playerNameEn,
        age: t.playerAge,
        playerTmId: t.player?.tmId ?? null,
      }));
      const matches = matchTransfers(rows, ours);
      const tmOnly = pickTransfermarktOnly(rows, matches, ours);
      tmRows += rows.length;
      matchedTransfers += matches.size;
      addedTransfers += tmOnly.length;

      await prisma.$transaction([
        // Re-derive everything for this club/direction so corrections on either side stick.
        prisma.transfer.updateMany({
          where: { ...group, source: "kff" },
          data: { tmPlayerId: null, feeType: null, feeAmount: null, marketValue: null, tmTransferId: null, tmCounterTeamName: null },
        }),
        prisma.transfer.deleteMany({
          where: { ...group, source: "tm", tmPlayerId: { notIn: tmOnly.map((r) => r.tmPlayerId) } },
        }),
        ...[...matches].map(([index, transferId]) => {
          const r = rows[index];
          return prisma.transfer.update({
            where: { id: transferId },
            data: {
              tmPlayerId: r.tmPlayerId,
              feeType: r.fee.type,
              feeAmount: r.fee.amount,
              marketValue: r.marketValue,
              tmTransferId: r.tmTransferId,
              tmCounterTeamName: r.counterClub?.name ?? null,
            },
          });
        }),
        ...tmOnly.map((r) => {
          const counterTeamId = r.counterClub?.tmId != null ? teamByTmId.get(r.counterClub.tmId) ?? null : null;
          const data = {
            source: "tm",
            counterTeamId,
            counterTeamName: r.counterClub?.name ?? null,
            counterTeamLogo: null,
            playerId: playerByTmId.get(r.tmPlayerId) ?? null,
            playerName: r.name,
            playerNameEn: r.name,
            playerPhotoUrl: null,
            playerPosition: mapTmPosition(r.position),
            playerAge: r.age,
            playerNationalityCode: countryCodeFromEnglish(r.nationality),
            playerNationality: r.nationality,
            feeType: r.fee.type,
            feeAmount: r.fee.amount,
            marketValue: r.marketValue,
            tmTransferId: r.tmTransferId,
          };
          return prisma.transfer.upsert({
            where: { seasonId_teamId_direction_tmPlayerId: { ...group, tmPlayerId: r.tmPlayerId } },
            create: { ...group, tmPlayerId: r.tmPlayerId, ...data },
            update: data,
          });
        }),
      ]);
    }
  }
  log.info(`transfers: matched ${matchedTransfers}/${tmRows} Transfermarkt rows, added ${addedTransfers} missing from kffleague.kz`);
}

/**
 * Transfermarkt rows to add as transfers of their own: unmatched, one per
 * player (a loan and its return keep the first), and not plausibly the same
 * person as a kffleague.kz transfer under a different spelling.
 */
export function pickTransfermarktOnly(rows: TmTransferRow[], matches: Map<number, string>, ours: OurTransfer[]): TmTransferRow[] {
  const seen = new Set(rows.filter((_, i) => matches.has(i)).map((r) => r.tmPlayerId));
  const picked: TmTransferRow[] = [];
  rows.forEach((r, i) => {
    if (matches.has(i) || seen.has(r.tmPlayerId)) return;
    const lookalike = ours.some((o) => Math.max(nameSimilarity(r.name, o.nameEn ?? ""), nameSimilarity(r.name, o.name)) >= 0.5);
    if (lookalike) return;
    seen.add(r.tmPlayerId);
    picked.push(r);
  });
  return picked;
}
