import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { handler, HttpError, parse } from "../../lib/http";
import { requireAuth, signToken } from "../../middleware/auth";

const router = Router();

// Slow down credential stuffing / signup spam.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new HttpError(429, "TOO_MANY_REQUESTS", "Too many attempts, try again later")),
});

const credentials = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().max(200),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// Pre-computed hash used to keep login timing constant for unknown emails.
const DUMMY_HASH = bcrypt.hashSync("qscore-timing-guard", 10);

const publicUser = (u: { id: string; email: string }) => ({ id: u.id, email: u.email });

router.post(
  "/register",
  authLimiter,
  handler(async (req, res) => {
    const { email, password } = parse(credentials, req.body);
    if (!EMAIL_RE.test(email)) throw new HttpError(400, "INVALID_EMAIL", "Invalid email");
    if (password.length < MIN_PASSWORD) throw new HttpError(400, "PASSWORD_TOO_SHORT", `Password must be at least ${MIN_PASSWORD} characters`);

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await prisma.user.create({ data: { email, passwordHash } });
      res.status(201);
      return { token: signToken(user.id), user: publicUser(user) };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") throw new HttpError(409, "EMAIL_TAKEN", "Email is already registered");
      throw err;
    }
  }),
);

router.post(
  "/login",
  authLimiter,
  handler(async (req) => {
    const { email, password } = parse(credentials, req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    return { token: signToken(user.id), user: publicUser(user) };
  }),
);

router.get(
  "/me",
  requireAuth,
  handler(async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new HttpError(401, "UNAUTHORIZED", "Account no longer exists");
    return publicUser(user);
  }),
);

/** Deletes the account with everything tied to it (favourites, predictions, poll votes). */
router.delete(
  "/me",
  requireAuth,
  handler(async (req) => {
    const userId = req.userId!;
    await prisma.$transaction([
      prisma.matchVote.deleteMany({ where: { voterId: `user:${userId}` } }),
      prisma.user.deleteMany({ where: { id: userId } }),
    ]);
    return { ok: true };
  }),
);

export default router;
