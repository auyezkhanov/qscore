import { Router } from "express";
import { z } from "zod";
import { badRequest, handler, parse } from "../../lib/http";
import { langOf } from "../../lib/i18n";
import rateLimit from "express-rate-limit";
import * as service from "./matches.service";
import { getMatchPreview } from "./preview.service";
import { castVote, getVotes, type Voter } from "./votes.service";
import { getTvSchedule } from "./tv.service";
import { userIdFromRequest } from "../../middleware/auth";
import { HttpError } from "../../lib/http";

const router = Router();

const MAX_RANGE_MS = 3 * 24 * 60 * 60 * 1000;
/** Default day boundaries when a plain date is given: Kazakhstan time (UTC+5). */
const KZ_OFFSET_MIN = -300;

const listQuery = z.union([
  z.object({ from: z.coerce.date(), to: z.coerce.date() }),
  z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), tzOffset: z.coerce.number().int().min(-840).max(840).optional() }),
]);

router.get(
  "/",
  handler(async (req) => {
    const q = parse(listQuery, req.query);
    let from: Date;
    let to: Date;
    if ("from" in q) {
      ({ from, to } = q);
    } else {
      from = new Date(Date.parse(`${q.date}T00:00:00Z`) + (q.tzOffset ?? KZ_OFFSET_MIN) * 60_000);
      to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    }
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw badRequest("INVALID_RANGE", "`to` must be after `from`");
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) throw badRequest("RANGE_TOO_LARGE", "range must not exceed 3 days");
    return service.listMatchesBetween(from, to, langOf(req));
  }),
);

const nextDayQuery = z.object({
  after: z.coerce.date(),
  tzOffset: z.coerce.number().int().min(-840).max(840).default(KZ_OFFSET_MIN),
});

router.get(
  "/next-day",
  handler(async (req) => {
    const q = parse(nextDayQuery, req.query);
    return (await service.nextMatchDay(q.after, q.tzOffset, langOf(req))) ?? { date: null, matches: [] };
  }),
);

router.get(
  "/tv",
  handler((req) => getTvSchedule(parse(z.object({ days: z.coerce.number().int().min(1).max(30).default(14) }), req.query).days, langOf(req))),
);
router.get("/:id", handler((req) => service.getMatch(req.params.id, langOf(req))));
router.get("/:id/preview", handler((req) => getMatchPreview(req.params.id, langOf(req))));

// Signed-in users vote as themselves; guests send a random device id they keep in localStorage.
const DEVICE_ID = /^[a-zA-Z0-9-]{16,64}$/;
function voterOf(req: Parameters<typeof userIdFromRequest>[0] & { headers: Record<string, string | string[] | undefined> }): Voter | null {
  const header = req.headers["x-voter-id"];
  const device = typeof header === "string" && DEVICE_ID.test(header) ? `device:${header}` : null;
  const userId = userIdFromRequest(req);
  if (userId) return { id: `user:${userId}`, device };
  return device ? { id: device, device: null } : null;
}

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new HttpError(429, "TOO_MANY_REQUESTS", "Too many votes")),
});

router.get("/:id/votes", handler((req) => getVotes(req.params.id, voterOf(req))));
router.post(
  "/:id/votes",
  voteLimiter,
  handler(async (req) => {
    const voter = voterOf(req);
    if (!voter) throw new HttpError(400, "VOTER_REQUIRED", "Sign in or send an X-Voter-Id header");
    const { choice } = parse(z.object({ choice: z.enum(["home", "draw", "away"]) }), req.body);
    return castVote(req.params.id, voter, choice);
  }),
);
router.get("/:id/h2h", handler((req) => service.getHeadToHead(req.params.id, langOf(req))));

export default router;
