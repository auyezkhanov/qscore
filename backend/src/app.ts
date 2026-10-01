import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { corsOrigins, env } from "./config/env";
import { prisma } from "./lib/prisma";
import { handler } from "./lib/http";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { currentJob } from "./sync/jobs";
import leagues from "./modules/leagues/leagues.routes";
import matches from "./modules/matches/matches.routes";
import teams from "./modules/teams/teams.routes";
import players from "./modules/players/players.routes";
import news from "./modules/news/news.routes";
import auth from "./modules/auth/auth.routes";
import favorites from "./modules/favorites/favorites.routes";
import media from "./modules/media/media.routes";
import search from "./modules/search/search.routes";
import push from "./modules/push/push.routes";
import predictions from "./modules/predictions/predictions.routes";
import calendar from "./modules/calendar/calendar.routes";

export function createApp() {
  const app = express();
  // Trust X-Forwarded-For only from our own proxy (see TRUST_PROXY), so clients
  // can't spoof their IP past rate limits.
  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");

  // The API only serves JSON and images consumed cross-origin by the SPA.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: corsOrigins }));
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));

  // Data changes at most every sync tick; a short private cache smooths polling.
  app.use("/api", (req, res, next) => {
    // Per-user responses must never be shared by a cache.
    const personal = ["/auth", "/favorites", "/push", "/predictions"].some((p) => req.path === p || req.path.startsWith(p + "/")) || req.path.endsWith("/votes");
    if (req.method === "GET" && !personal) {
      res.setHeader("Cache-Control", "public, max-age=15");
    } else {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });

  app.get(
    "/api/health",
    handler(async () => {
      const [runs, seasons] = await Promise.all([prisma.syncRun.findMany(), prisma.season.count({ where: { isCurrent: true } })]);
      // "degraded" when background sync is on but live data has gone stale (stuck or failing).
      const live = runs.find((r) => r.job === "live");
      const stale = env.SYNC_ENABLED && seasons > 0 && (!live?.lastSuccessAt || Date.now() - live.lastSuccessAt.getTime() > 10 * 60 * 1000);
      return {
        status: stale ? "degraded" : "ok",
        ready: seasons > 0,
        syncing: currentJob(),
        // Error details stay in the server logs; publicly we only say whether the last run failed.
        sync: Object.fromEntries(runs.map((r) => [r.job, { lastStartedAt: r.lastStartedAt, lastSuccessAt: r.lastSuccessAt, failed: !!r.lastError }])),
      };
    }),
  );

  app.use("/api/leagues", leagues);
  app.use("/api/matches", matches);
  app.use("/api/teams", teams);
  app.use("/api/players", players);
  app.use("/api/news", news);
  app.use("/api/auth", auth);
  app.use("/api/favorites", favorites);
  app.use("/api/media", media);
  app.use("/api/search", search);
  app.use("/api/push", push);
  app.use("/api/predictions", predictions);
  app.use("/api/calendar", calendar);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
