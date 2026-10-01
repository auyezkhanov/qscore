import rateLimit from "express-rate-limit";
import { HttpError } from "./http";

/**
 * Per-IP limiter for routes that fan out to third-party sources (careers,
 * image proxy): cached hits are cheap, but cache misses must not be scriptable.
 */
export function upstreamLimiter(limit: number, windowMs = 60 * 1000) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, "TOO_MANY_REQUESTS", "Too many requests, try again later")),
  });
}
