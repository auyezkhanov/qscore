import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/http";
import { countryName, localized, type Lang } from "../../lib/i18n";
import { matchSummaryInclude, teamRefSelect, toLeagueRef, toMatchSummary, toTeamRef } from "../shared/dto";
import { toTransferDto, transferInclude } from "../leagues/leagues.service";
import { STADIUM_FACTS } from "./stadiumFacts";

const POSITION_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 } as const;

export function ageFrom(birthDate: Date | null, now = new Date()): number | null {
  if (!birthDate) return null;
  let age = now.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate());
  if (beforeBirthday) age--;
  return age >= 0 && age < 100 ? age : null;
}

export async function listTeams(leagueSlug: string | undefined, lang: Lang) {
  const teams = await prisma.team.findMany({
    where: leagueSlug ? { standings: { some: { season: { isCurrent: true, league: { slug: leagueSlug } } } } } : undefined,
    select: teamRefSelect,
  });
  const locale = lang === "en" ? "en" : "ru";
  return teams.map((t) => toTeamRef(t, lang)).sort((a, b) => a.name.localeCompare(b.name, locale));
}

async function requireTeam(slug: string) {
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) throw notFound("Team");
  return team;
}

export async function getTeam(slug: string, lang: Lang) {
  const team = await requireTeam(slug);
  const now = new Date();

  const [standing, players, recent, upcoming] = await Promise.all([
    prisma.standing.findFirst({
      where: { teamId: team.id, season: { isCurrent: true } },
      include: { season: { include: { league: true } } },
      // A club can only be in one current table, but prefer the top tier if data is odd.
      orderBy: { season: { league: { tier: "asc" } } },
    }),
    prisma.player.findMany({ where: { teamId: team.id, isActive: true } }),
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }], status: "FINISHED" },
      orderBy: { kickoff: "desc" },
      take: 5,
      include: matchSummaryInclude,
    }),
    prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
        status: { in: ["SCHEDULED", "LIVE", "HALFTIME"] },
        kickoff: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      },
      orderBy: { kickoff: "asc" },
      take: 5,
      include: matchSummaryInclude,
    }),
  ]);

  const facts = STADIUM_FACTS[team.name];
  const squad = players
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: localized(p.name, p.nameEn, lang),
      photoUrl: p.photoUrl,
      position: p.position,
      number: p.number,
      nationality: countryName(p.nationalityCode, p.nationality, lang),
      nationalityCode: p.nationalityCode,
      age: ageFrom(p.birthDate),
      goals: p.goals,
      assists: p.assists,
      appearances: p.appearances,
      minutesPlayed: p.minutesPlayed,
      marketValue: p.marketValue,
    }))
    .sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || (a.number ?? 999) - (b.number ?? 999));

  return {
    ...toTeamRef(team, lang),
    city: localized(team.city, null, lang),
    stadium: team.stadium
      ? {
          name: localized(team.stadium, team.stadiumEn, lang),
          capacity: team.stadiumCapacity ?? facts?.capacity ?? null,
          opened: facts?.opened ?? null,
          surface: team.stadiumSurface,
        }
      : null,
    league: standing ? toLeagueRef(standing.season.league, lang) : null,
    squadValue: team.squadValue,
    standing: standing
      ? {
          position: standing.position,
          played: standing.played,
          wins: standing.wins,
          draws: standing.draws,
          losses: standing.losses,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          points: standing.points,
        }
      : null,
    squad,
    coaches: await coachRecords(team.id, lang),
    recentMatches: recent.map((m) => toMatchSummary(m, lang)),
    upcomingMatches: upcoming.map((m) => toMatchSummary(m, lang)),
  };
}

/** Every fixture of the club in its current season(s), chronological. */
export async function getTeamMatches(slug: string, lang: Lang) {
  const team = await requireTeam(slug);
  const matches = await prisma.match.findMany({
    where: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }], season: { isCurrent: true } },
    orderBy: { kickoff: "asc" },
    include: matchSummaryInclude,
  });
  return matches.map((m) => toMatchSummary(m, lang));
}

export async function getTeamTransfers(slug: string, lang: Lang) {
  const team = await requireTeam(slug);
  const rows = await prisma.transfer.findMany({
    where: { teamId: team.id, season: { isCurrent: true } },
    orderBy: [{ direction: "asc" }, { createdAt: "desc" }, { playerName: "asc" }],
    include: transferInclude,
  });
  return rows.map((t) => toTransferDto(t, lang));
}

/**
 * Head coaches of the club this season with their record (from the coach
 * listed in each match's lineup sheet), current coach first.
 */
export async function coachRecords(teamId: string, lang: Lang) {
  const matches = await prisma.match.findMany({
    where: { season: { isCurrent: true }, OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
    orderBy: { kickoff: "asc" },
    select: { kickoff: true, status: true, homeTeamId: true, homeScore: true, awayScore: true, homeCoach: true, homeCoachEn: true, awayCoach: true, awayCoachEn: true },
  });
  type Record = { name: string; nameEn: string | null; matches: number; wins: number; draws: number; losses: number; first: Date; last: Date };
  const byName = new Map<string, Record>();
  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    const name = isHome ? m.homeCoach : m.awayCoach;
    if (!name) continue;
    const rec = byName.get(name) ?? { name, nameEn: (isHome ? m.homeCoachEn : m.awayCoachEn) ?? null, matches: 0, wins: 0, draws: 0, losses: 0, first: m.kickoff, last: m.kickoff };
    rec.last = m.kickoff;
    if (m.status === "FINISHED" && m.homeScore != null && m.awayScore != null) {
      const gf = isHome ? m.homeScore : m.awayScore;
      const ga = isHome ? m.awayScore : m.homeScore;
      rec.matches++;
      if (gf > ga) rec.wins++;
      else if (gf < ga) rec.losses++;
      else rec.draws++;
    }
    byName.set(name, rec);
  }
  return [...byName.values()]
    .sort((a, b) => b.last.getTime() - a.last.getTime())
    .map((r, i) => ({
      name: localized(r.name, r.nameEn, lang),
      current: i === 0,
      matches: r.matches,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      winRate: r.matches ? Math.round((r.wins / r.matches) * 100) : null,
      pointsPerMatch: r.matches ? Math.round(((r.wins * 3 + r.draws) / r.matches) * 100) / 100 : null,
      since: r.first.toISOString().slice(0, 10),
    }));
}
