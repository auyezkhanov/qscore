import { prisma } from "../lib/prisma";
import type { ChampionshipEntry } from "../integrations/kff/types";
import type { LeagueConfig } from "./config";

export async function upsertLeagueSeason(cfg: LeagueConfig, entry: ChampionshipEntry) {
  const year = Number(entry.name.match(/\d{4}/)?.[0] ?? new Date().getFullYear());

  const league = await prisma.league.upsert({
    where: { slug: cfg.slug },
    create: {
      slug: cfg.slug,
      externalCode: cfg.code,
      name: cfg.name,
      nameEn: cfg.nameEn,
      country: "KZ",
      tier: cfg.tier,
    },
    update: { name: cfg.name, nameEn: cfg.nameEn, tier: cfg.tier, externalCode: cfg.code },
  });

  // Flip the "current" flag atomically so readers never observe a league with
  // no current season mid-sync.
  const season = await prisma.$transaction(async (tx) => {
    const current = await tx.season.upsert({
      where: { externalId: entry.season_id },
      create: {
        externalId: entry.season_id,
        leagueId: league.id,
        year,
        isCurrent: true,
        currentRound: entry.current_round,
        totalRounds: entry.total_rounds,
      },
      update: { isCurrent: true, year, currentRound: entry.current_round, totalRounds: entry.total_rounds },
    });
    await tx.season.updateMany({
      where: { leagueId: league.id, id: { not: current.id }, isCurrent: true },
      data: { isCurrent: false },
    });
    return current;
  });

  return { league, season };
}
