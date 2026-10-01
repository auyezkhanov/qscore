import { Router } from "express";
import { z } from "zod";
import { handler, parse } from "../../lib/http";
import { langOf } from "../../lib/i18n";
import * as service from "./teams.service";

const router = Router();

const listQuery = z.object({ league: z.string().min(1).optional() });

router.get("/", handler((req) => service.listTeams(parse(listQuery, req.query).league, langOf(req))));
router.get("/:slug", handler((req) => service.getTeam(req.params.slug, langOf(req))));
router.get("/:slug/matches", handler((req) => service.getTeamMatches(req.params.slug, langOf(req))));
router.get("/:slug/transfers", handler((req) => service.getTeamTransfers(req.params.slug, langOf(req))));

export default router;
