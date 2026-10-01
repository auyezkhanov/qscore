import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../lib/http";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const TOKEN_TTL = "30d";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function userIdFrom(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET);
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** The signed-in user id when a valid token is present, otherwise null (for optional-auth routes). */
export function userIdFromRequest(req: { headers: { authorization?: string } }): string | null {
  return userIdFrom(req.headers.authorization);
}

/** Requires a valid token for an account that still exists (deleted accounts get 401, not 500s). */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const userId = userIdFrom(req.headers.authorization);
  if (!userId) return next(new HttpError(401, "UNAUTHORIZED", "Authentication required"));
  prisma.user
    .count({ where: { id: userId } })
    .then((n) => {
      if (n === 0) return next(new HttpError(401, "UNAUTHORIZED", "Account no longer exists"));
      req.userId = userId;
      next();
    })
    .catch(next);
};
