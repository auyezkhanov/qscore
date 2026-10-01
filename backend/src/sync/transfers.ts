import type { TransferDirection } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createLogger } from "../lib/logger";
import { kff, sleep } from "../integrations/kff/client";
import { countryCode, fullName, mapPosition } from "../integrations/kff/mappers";
import type { TransferClub, TransferPlayer } from "../integrations/kff/types";
import { REQUEST_GAP_MS } from "./config";
import type { PlayerIdMap } from "./players";
import type { TeamIdMap } from "./teams";

const log = createLogger("sync:transfers");

async function upsertTransfer(
  seasonId: string,
  teamId: string,
  direction: TransferDirection,
  player: TransferPlayer,
  nameEn: string | null,
  counter: TransferClub,
  teamIds: TeamIdMap,
  playerIds: PlayerIdMap,
) {
  const data = {
    counterTeamId: counter ? (teamIds.get(counter.id) ?? null) : null,
    counterTeamName: counter?.name ?? null,
    counterTeamLogo: counter?.logo_url ?? null,
    playerId: playerIds.get(player.id) ?? null,
    playerName: fullName(player.first_name, player.last_name),
    playerNameEn: nameEn,
    playerPhotoUrl: player.photo_url,
    playerPosition: player.position ? mapPosition(player.position) : null,
    playerAge: player.age,
    playerNationalityCode: countryCode(player.country),
    playerNationality: player.country?.name ?? null,
  };
  await prisma.transfer.upsert({
    where: {
      seasonId_teamId_direction_playerExternalId: { seasonId, teamId, direction, playerExternalId: player.id },
    },
    create: { seasonId, teamId, direction, playerExternalId: player.id, ...data },
    update: data,
  });
}

export async function syncTransfers(
  seasonId: string,
  seasonExtId: number,
  teamExtIds: number[],
  teamIds: TeamIdMap,
  playerIds: PlayerIdMap,
) {
  for (const teamExtId of teamExtIds) {
    const teamId = teamIds.get(teamExtId);
    if (!teamId) continue;
    try {
      const [ru, en] = await Promise.all([
        kff.teamTransfers(seasonExtId, teamExtId, "ru"),
        kff.teamTransfers(seasonExtId, teamExtId, "en").catch(() => null),
      ]);
      const enNames = new Map<number, string>();
      for (const e of [...(en?.arrivals ?? []), ...(en?.departures ?? [])]) {
        enNames.set(e.player.id, fullName(e.player.first_name, e.player.last_name));
      }
      for (const a of ru.arrivals) {
        await upsertTransfer(seasonId, teamId, "IN", a.player, enNames.get(a.player.id) ?? null, a.from_team, teamIds, playerIds);
      }
      for (const d of ru.departures) {
        await upsertTransfer(seasonId, teamId, "OUT", d.player, enNames.get(d.player.id) ?? null, d.to_team, teamIds, playerIds);
      }
      // Remove moves the source has since withdrawn — only when it returned a non-empty
      // list for that side, so a glitchy empty answer can't wipe a club's transfers.
      for (const [direction, list] of [
        ["IN", ru.arrivals],
        ["OUT", ru.departures],
      ] as const) {
        if (list.length === 0) continue;
        await prisma.transfer.deleteMany({
          where: { seasonId, teamId, direction, source: "kff", playerExternalId: { notIn: list.map((e) => e.player.id) } },
        });
      }
    } catch (err) {
      log.warn(`transfers for team ${teamExtId} failed`, err);
    }
    await sleep(REQUEST_GAP_MS);
  }
}
