import { Router } from "express";
import { z } from "zod";
import { handler, parse } from "../../lib/http";
import { langOf } from "../../lib/i18n";
import * as service from "./leagues.service";
import { getLeaders, getTeamStats, MATCH_STATS, SEASON_STATS } from "./stats.service";
import { getArchivedRounds, getArchivedStandings, listSeasons } from "./archive.service";

const router = Router();

const topQuery = z.object({
  stat: z.enum([...SEASON_STATS, ...MATCH_STATS]).default("goals"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const transfersQuery = z.object({
  sort: z.enum(["recent", "fee"]).default("recent"),
  team: z.string().min(1).optional(),
  position: z.enum(["GK", "DF", "MF", "FW"]).optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(2000),
});

router.get("/", handler((req) => service.listLeagues(langOf(req))));
router.get("/:slug", handler((req) => service.getLeague(req.params.slug, langOf(req))));
router.get("/:slug/standings", handler((req) => service.getStandings(req.params.slug, langOf(req))));
router.get("/:slug/rounds", handler((req) => service.getRounds(req.params.slug, langOf(req))));
router.get(
  "/:slug/top-players",
  handler((req) => {
    const q = parse(topQuery, req.query);
    return getLeaders(req.params.slug, q.stat, q.limit, langOf(req));
  }),
);
const year = z.coerce.number().int().min(2000).max(2100);
router.get("/:slug/seasons", handler((req) => listSeasons(req.params.slug)));
router.get("/:slug/seasons/:year/standings", handler((req) => getArchivedStandings(req.params.slug, parse(year, req.params.year), langOf(req))));
router.get("/:slug/seasons/:year/rounds", handler((req) => getArchivedRounds(req.params.slug, parse(year, req.params.year), langOf(req))));
router.get("/:slug/team-stats", handler((req) => getTeamStats(req.params.slug, langOf(req))));
router.get(
  "/:slug/transfers",
  handler((req) => service.getLeagueTransfers(req.params.slug, parse(transfersQuery, req.query), langOf(req))),
);

export default router;
