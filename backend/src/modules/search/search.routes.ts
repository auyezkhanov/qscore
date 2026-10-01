import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { handler, parse } from "../../lib/http";
import { langOf, localized } from "../../lib/i18n";
import { teamRefSelect, toTeamRef } from "../shared/dto";

const router = Router();

const query = z.object({
  q: z.string().trim().min(2).max(60),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

router.get(
  "/",
  handler(async (req) => {
    const { q, limit } = parse(query, req.query);
    const lang = langOf(req);
    const match = { contains: q, mode: "insensitive" as const };

    const [teams, players] = await Promise.all([
      prisma.team.findMany({
        where: { OR: [{ name: match }, { nameEn: match }], standings: { some: { season: { isCurrent: true } } } },
        select: teamRefSelect,
        take: limit,
      }),
      prisma.player.findMany({
        where: { OR: [{ name: match }, { nameEn: match }] },
        // Current squad members and regular starters first.
        orderBy: [{ isActive: "desc" }, { appearances: "desc" }],
        take: limit,
        include: { team: { select: teamRefSelect } },
      }),
    ]);

    return {
      teams: teams.map((t) => toTeamRef(t, lang)),
      players: players.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: localized(p.name, p.nameEn, lang),
        photoUrl: p.photoUrl,
        position: p.position,
        team: toTeamRef(p.team, lang),
      })),
    };
  }),
);

export default router;
