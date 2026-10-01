import { Router, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { handler, notFound } from "../../lib/http";
import { langOf, localized, type Lang } from "../../lib/i18n";
import { buildCalendar, type CalendarEvent } from "./ics";

const router = Router();

const SCORE_LABEL: Record<Lang, string> = { ru: "Счёт", en: "Score" };

async function fixtureEvents(where: Prisma.MatchWhereInput, lang: Lang): Promise<CalendarEvent[]> {
  const matches = await prisma.match.findMany({
    // AND keeps the caller's own `season` filter (a spread would overwrite it).
    where: { AND: [where, { season: { isCurrent: true } }, { status: { not: "CANCELLED" } }] },
    orderBy: { kickoff: "asc" },
    include: {
      homeTeam: { select: { name: true, nameEn: true } },
      awayTeam: { select: { name: true, nameEn: true } },
      season: { select: { league: { select: { name: true, nameEn: true } } } },
    },
  });
  return matches.map((m) => {
    const home = localized(m.homeTeam.name, m.homeTeam.nameEn, lang);
    const away = localized(m.awayTeam.name, m.awayTeam.nameEn, lang);
    const scored = m.homeScore != null && m.awayScore != null;
    return {
      uid: `${m.id}@qscore`,
      start: m.kickoff,
      duration: 120,
      allDay: m.timeTbd && m.status === "SCHEDULED",
      summary: scored ? `${home} ${m.homeScore}–${m.awayScore} ${away}` : `${home} — ${away}`,
      description: [lang === "en" ? m.season.league.nameEn : m.season.league.name, scored ? `${SCORE_LABEL[lang]}: ${m.homeScore}–${m.awayScore}` : null]
        .filter(Boolean)
        .join("\n"),
      location: [localized(m.stadium, m.stadiumEn, lang), localized(m.city, null, lang)].filter(Boolean).join(", ") || null,
      url: `${env.PUBLIC_URL}/match/${m.id}`,
      updated: m.updatedAt,
    };
  });
}

function sendCalendar(res: Response, filename: string, body: string) {
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${filename}.ics"`);
  res.setHeader("Cache-Control", "public, max-age=1800");
  res.send(body);
}

router.get(
  "/teams/:slug.ics",
  handler(async (req, res) => {
    const lang = langOf(req);
    const team = await prisma.team.findUnique({ where: { slug: req.params.slug } });
    if (!team) throw notFound("Team");
    const events = await fixtureEvents({ OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] }, lang);
    sendCalendar(res, team.slug, buildCalendar(`${localized(team.name, team.nameEn, lang)} · Qscore`, events));
  }),
);

router.get(
  "/leagues/:slug.ics",
  handler(async (req, res) => {
    const lang = langOf(req);
    const league = await prisma.league.findUnique({ where: { slug: req.params.slug } });
    if (!league) throw notFound("League");
    const events = await fixtureEvents({ season: { leagueId: league.id } }, lang);
    sendCalendar(res, league.slug, buildCalendar(`${lang === "en" ? league.nameEn : league.name} · Qscore`, events));
  }),
);

export default router;
