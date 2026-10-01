import { TtlCache } from "../../lib/cache";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { handler, HttpError, notFound, parse } from "../../lib/http";
import { langOf } from "../../lib/i18n";
import { requireAuth, userIdFromRequest } from "../../middleware/auth";
import { matchSummaryInclude, toMatchSummary } from "../shared/dto";
import { maskEmail, scorePrediction } from "./scoring";

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new HttpError(429, "TOO_MANY_REQUESTS", "Too many requests")),
});

const DAY = 24 * 60 * 60 * 1000;
const isOpen = (m: { status: string; kickoff: Date }) => m.status === "SCHEDULED" && m.kickoff.getTime() > Date.now();
const finalScore = (m: { status: string; homeScore: number | null; awayScore: number | null }) =>
  m.status === "FINISHED" && m.homeScore != null && m.awayScore != null ? { homeScore: m.homeScore, awayScore: m.awayScore } : null;

/** Upcoming fixtures to predict plus the last week's results, with the caller's picks. */
router.get(
  "/fixtures",
  handler(async (req) => {
    const lang = langOf(req);
    const userId = userIdFromRequest(req);
    const now = Date.now();
    const matches = await prisma.match.findMany({
      where: {
        season: { isCurrent: true },
        status: { not: "CANCELLED" },
        // The coming fortnight and last week's results, plus every match the user
        // predicted this season (so their full history shows under "Results").
        OR: [
          { kickoff: { gte: new Date(now - 7 * DAY), lte: new Date(now + 14 * DAY) } },
          ...(userId ? [{ predictions: { some: { userId } } }] : []),
        ],
      },
      orderBy: [{ kickoff: "asc" }, { id: "asc" }],
      include: matchSummaryInclude,
    });
    const mine = userId
      ? new Map(
          (await prisma.prediction.findMany({ where: { userId, matchId: { in: matches.map((m) => m.id) } } })).map((p) => [p.matchId, p]),
        )
      : new Map();
    return matches.map((m) => {
      const p = mine.get(m.id);
      const actual = finalScore(m);
      return {
        match: toMatchSummary(m, lang),
        open: isOpen(m),
        prediction: p ? { homeScore: p.homeScore, awayScore: p.awayScore, points: actual ? scorePrediction(p, actual) : null } : null,
      };
    });
  }),
);

const scoreBody = z.object({ homeScore: z.number().int().min(0).max(20), awayScore: z.number().int().min(0).max(20) });

router.put(
  "/:matchId",
  limiter,
  requireAuth,
  handler(async (req) => {
    const { homeScore, awayScore } = parse(scoreBody, req.body);
    const match = await prisma.match.findUnique({ where: { id: req.params.matchId }, select: { id: true, status: true, kickoff: true } });
    if (!match) throw notFound("Match");
    if (!isOpen(match)) throw new HttpError(409, "PREDICTIONS_CLOSED", "Predictions close at kick-off");
    const p = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: req.userId!, matchId: match.id } },
      create: { userId: req.userId!, matchId: match.id, homeScore, awayScore },
      update: { homeScore, awayScore },
    });
    return { homeScore: p.homeScore, awayScore: p.awayScore, points: null };
  }),
);

router.delete(
  "/:matchId",
  limiter,
  requireAuth,
  handler(async (req) => {
    const match = await prisma.match.findUnique({ where: { id: req.params.matchId }, select: { status: true, kickoff: true } });
    if (!match) throw notFound("Match");
    if (!isOpen(match)) throw new HttpError(409, "PREDICTIONS_CLOSED", "Predictions close at kick-off");
    await prisma.prediction.deleteMany({ where: { userId: req.userId!, matchId: req.params.matchId } });
    return { ok: true };
  }),
);

type Totals = { userId: string; points: number; exact: number; outcomes: number; predictions: number };

// Only finished matches score, so standings move at most once per sync tick.
const leaderboardCache = new TtlCache<(Totals & { email: string })[]>(60 * 1000, 1);
const leaderboard = () => leaderboardCache.get("current", computeLeaderboard);

/** Season standings of all predictors, scored from finished matches. */
async function computeLeaderboard(): Promise<(Totals & { email: string })[]> {
  const preds = await prisma.prediction.findMany({
    where: { match: { status: "FINISHED", season: { isCurrent: true }, homeScore: { not: null }, awayScore: { not: null } } },
    select: { userId: true, homeScore: true, awayScore: true, match: { select: { homeScore: true, awayScore: true } }, user: { select: { email: true } } },
  });
  const totals = new Map<string, Totals & { email: string }>();
  for (const p of preds) {
    const pts = scorePrediction(p, { homeScore: p.match.homeScore!, awayScore: p.match.awayScore! });
    const t = totals.get(p.userId) ?? { userId: p.userId, email: p.user.email, points: 0, exact: 0, outcomes: 0, predictions: 0 };
    t.points += pts;
    t.predictions++;
    if (pts === 3) t.exact++;
    if (pts > 0) t.outcomes++;
    totals.set(p.userId, t);
  }
  return [...totals.values()].sort((a, b) => b.points - a.points || b.exact - a.exact || a.predictions - b.predictions);
}

router.get(
  "/leaderboard",
  handler(async (req) => {
    const userId = userIdFromRequest(req);
    const all = await leaderboard();
    const ranked = all.map((t, i) => ({
      rank: i > 0 && all[i - 1].points === t.points && all[i - 1].exact === t.exact ? -1 : i + 1,
      name: maskEmail(t.email),
      points: t.points,
      exact: t.exact,
      outcomes: t.outcomes,
      predictions: t.predictions,
      isMe: t.userId === userId,
    }));
    // Shared places: copy the rank down through ties.
    for (let i = 0; i < ranked.length; i++) if (ranked[i].rank === -1) ranked[i].rank = ranked[i - 1].rank;
    const top = ranked.slice(0, 50);
    const me = ranked.find((r) => r.isMe) ?? null;
    return { total: ranked.length, top, me: me && !top.includes(me) ? me : null };
  }),
);

export default router;
