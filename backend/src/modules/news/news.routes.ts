import { Router } from "express";
import { z } from "zod";
import { handler, parse } from "../../lib/http";
import { langOf } from "../../lib/i18n";
import * as service from "./news.service";

const router = Router();

const listQuery = z.object({
  league: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get("/", handler((req) => service.listNews(parse(listQuery, req.query), langOf(req))));
router.get(
  "/:id",
  handler((req) => service.getArticle(parse(z.coerce.number().int().positive(), req.params.id), langOf(req))),
);

export default router;
