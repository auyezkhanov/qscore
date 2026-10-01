import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { handler, HttpError, notFound, parse } from "../../lib/http";
import { userIdFromRequest } from "../../middleware/auth";
import { initPush, isAllowedPushEndpoint } from "./push.service";

const router = Router();

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, "TOO_MANY_REQUESTS", "Too many requests")),
  }),
);

const endpoint = z.string().url().max(1000).refine(isAllowedPushEndpoint, "not a known push service");
const subscribeBody = z.object({
  subscription: z.object({ endpoint, keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }) }),
  lang: z.enum(["ru", "en"]).default("ru"),
});

const subscriptionView = (s: { teamIds: string[]; matchIds: string[] }) => ({ teamIds: s.teamIds, matchIds: s.matchIds });

router.get("/public-key", handler(async () => ({ key: await initPush() })));

/** Registers (or refreshes) a browser push subscription. */
router.post(
  "/subscriptions",
  handler(async (req) => {
    const { subscription, lang } = parse(subscribeBody, req.body);
    const userId = userIdFromRequest(req);
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, lang, userId },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, lang, ...(userId ? { userId } : {}) },
    });
    return subscriptionView(sub);
  }),
);

router.get(
  "/subscriptions",
  handler(async (req) => {
    const ep = parse(endpoint, req.query.endpoint);
    const sub = await prisma.pushSubscription.findUnique({ where: { endpoint: ep } });
    if (!sub) throw notFound("Subscription");
    return subscriptionView(sub);
  }),
);

const followBody = z
  .object({
    endpoint,
    teamId: z.string().min(1).max(64).optional(),
    matchId: z.string().min(1).max(64).optional(),
    follow: z.boolean(),
  })
  .refine((b) => !!b.teamId !== !!b.matchId, "exactly one of teamId / matchId");

/** Follows or unfollows one club or match on this device. */
router.put(
  "/subscriptions/follow",
  handler(async (req) => {
    const b = parse(followBody, req.body);
    const sub = await prisma.pushSubscription.findUnique({ where: { endpoint: b.endpoint } });
    if (!sub) throw notFound("Subscription");
    if (b.teamId && !(await prisma.team.findUnique({ where: { id: b.teamId }, select: { id: true } }))) throw notFound("Team");
    if (b.matchId && !(await prisma.match.findUnique({ where: { id: b.matchId }, select: { id: true } }))) throw notFound("Match");

    const toggle = (list: string[], id: string | undefined) =>
      !id ? list : b.follow ? [...new Set([...list, id])] : list.filter((x) => x !== id);
    const updated = await prisma.pushSubscription.update({
      where: { id: sub.id },
      data: { teamIds: toggle(sub.teamIds, b.teamId).slice(0, 50), matchIds: toggle(sub.matchIds, b.matchId).slice(-200) },
    });
    return subscriptionView(updated);
  }),
);

router.delete(
  "/subscriptions",
  handler(async (req) => {
    const { endpoint: ep } = parse(z.object({ endpoint }), req.body);
    await prisma.pushSubscription.deleteMany({ where: { endpoint: ep } });
    return { ok: true };
  }),
);

export default router;
