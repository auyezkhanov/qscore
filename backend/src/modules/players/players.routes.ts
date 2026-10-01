import { Router } from "express";
import { handler } from "../../lib/http";
import { langOf } from "../../lib/i18n";
import { upstreamLimiter } from "../../lib/rateLimit";
import * as service from "./players.service";

const router = Router();
// Careers are loaded live from the source (dozens of calls per uncached player).
const careerLimiter = upstreamLimiter(30);

router.get("/:slug", handler((req) => service.getPlayer(req.params.slug, langOf(req))));
router.get("/:slug/stats", handler((req) => service.getPlayerStats(req.params.slug, langOf(req))));
router.get("/:slug/market-value", careerLimiter, handler((req) => service.getMarketValueHistory(req.params.slug)));
router.get("/:slug/career", careerLimiter, handler((req) => service.getPlayerCareer(req.params.slug, langOf(req))));

export default router;
