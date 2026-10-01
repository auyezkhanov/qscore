import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { handler, notFound, parse } from "../../lib/http";
import { requireAuth } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

async function favoriteIds(userId: string): Promise<string[]> {
  const rows = await prisma.favoriteMatch.findMany({ where: { userId }, select: { matchId: true }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => r.matchId);
}

router.get("/", handler((req) => favoriteIds(req.userId!)));

router.put(
  "/:matchId",
  handler(async (req) => {
    const userId = req.userId!;
    const { matchId } = req.params;
    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
    if (!match) throw notFound("Match");
    await prisma.favoriteMatch.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { userId, matchId },
      update: {},
    });
    return favoriteIds(userId);
  }),
);

router.delete(
  "/:matchId",
  handler(async (req) => {
    await prisma.favoriteMatch.deleteMany({ where: { userId: req.userId!, matchId: req.params.matchId } });
    return favoriteIds(req.userId!);
  }),
);

const mergeBody = z.object({ matchIds: z.array(z.string().min(1).max(64)).max(1000) });

/** Adopts favourites picked while signed out; unknown/stale ids are ignored. */
router.post(
  "/merge",
  handler(async (req) => {
    const userId = req.userId!;
    const { matchIds } = parse(mergeBody, req.body);
    if (matchIds.length > 0) {
      const existing = await prisma.match.findMany({ where: { id: { in: matchIds } }, select: { id: true } });
      await prisma.favoriteMatch.createMany({
        data: existing.map((m) => ({ userId, matchId: m.id })),
        skipDuplicates: true,
      });
    }
    return favoriteIds(userId);
  }),
);

export default router;
