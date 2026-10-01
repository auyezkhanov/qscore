import type { EventType, MatchStatus, PlayerMatchStat, Position } from "@prisma/client";
import { playerOfTheMatch } from "../../lib/rating";
import type { Absence, BroadcasterDto, Official } from "../../integrations/kff/matchMappers";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/http";
import { localized, type Lang } from "../../lib/i18n";
import { matchSummaryInclude, toMatchSummary } from "../shared/dto";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function listMatchesBetween(from: Date, to: Date, lang: Lang) {
  const matches = await prisma.match.findMany({
    where: { kickoff: { gte: from, lt: to } },
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    include: matchSummaryInclude,
  });
  return matches.map((m) => toMatchSummary(m, lang));
}

/**
 * The next calendar day (in the caller's time zone) that has fixtures, starting
 * strictly after `after`. `tzOffset` follows Date#getTimezoneOffset (UTC − local, minutes).
 */
export async function nextMatchDay(after: Date, tzOffset: number, lang: Lang) {
  const next = await prisma.match.findFirst({
    where: { kickoff: { gte: after }, status: { notIn: ["CANCELLED"] } },
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  });
  if (!next) return null;

  const offsetMs = tzOffset * 60 * 1000;
  const localDayStart = Math.floor((next.kickoff.getTime() - offsetMs) / DAY_MS) * DAY_MS;
  const from = new Date(localDayStart + offsetMs);
  const to = new Date(from.getTime() + DAY_MS);
  return {
    date: new Date(localDayStart).toISOString().slice(0, 10),
    matches: await listMatchesBetween(from, to, lang),
  };
}

const GOAL_TYPES: EventType[] = ["GOAL", "PENALTY_GOAL"];
type Side = "home" | "away";

export async function getMatch(id: string, lang: Lang) {
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      ...matchSummaryInclude,
      events: {
        orderBy: [{ minute: "asc" }, { addedTime: "asc" }, { externalId: "asc" }],
        include: {
          player: { select: { id: true, slug: true, name: true, nameEn: true } },
          relatedPlayer: { select: { id: true, slug: true, name: true, nameEn: true } },
        },
      },
      lineups: {
        include: { player: { select: { id: true, slug: true, name: true, nameEn: true, photoUrl: true } } },
        orderBy: [{ isStarting: "desc" }, { shirtNumber: "asc" }],
      },
      stats: true,
      playerStats: true,
    },
  });
  if (!match) throw notFound("Match");

  const sideOf = (teamId: string): Side => (teamId === match.homeTeamId ? "home" : "away");
  const personRef = (
    p: { id: string; slug: string; name: string; nameEn: string | null } | null,
    fallbackName: string | null,
  ) => (p ? { id: p.id, slug: p.slug, name: localized(p.name, p.nameEn, lang) } : fallbackName ? { id: null, slug: null, name: localized(fallbackName, null, lang) } : null);

  // ---- events with a running score ----
  let home = 0;
  let away = 0;
  const events = match.events.map((e) => {
    const ownSide = sideOf(e.teamId);
    // An own goal counts for the other side, so it's shown there.
    const side: Side = e.type === "OWN_GOAL" ? (ownSide === "home" ? "away" : "home") : ownSide;
    let score: [number, number] | null = null;
    if (GOAL_TYPES.includes(e.type) || e.type === "OWN_GOAL") {
      if (side === "home") home++;
      else away++;
      score = [home, away];
    }
    return {
      id: e.id,
      type: e.type,
      minute: e.minute,
      addedTime: e.addedTime,
      side,
      score,
      player: personRef(e.player, e.playerName),
      relatedPlayer: personRef(e.relatedPlayer, e.relatedPlayerName),
    };
  });

  // ---- per-player match facts for the lineup view ----
  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  const ownGoals = new Map<string, number>();
  const cards = new Map<string, "yellow" | "red">();
  const subbedIn = new Map<string, number>();
  const subbedOut = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string | null) => key && map.set(key, (map.get(key) ?? 0) + 1);

  for (const e of match.events) {
    if (GOAL_TYPES.includes(e.type)) {
      bump(goals, e.playerId);
      bump(assists, e.relatedPlayerId);
    } else if (e.type === "OWN_GOAL") bump(ownGoals, e.playerId);
    else if (e.type === "YELLOW_CARD" && e.playerId && !cards.has(e.playerId)) cards.set(e.playerId, "yellow");
    else if ((e.type === "RED_CARD" || e.type === "SECOND_YELLOW") && e.playerId) cards.set(e.playerId, "red");
    else if (e.type === "SUBSTITUTION") {
      if (e.playerId) subbedOut.set(e.playerId, e.minute);
      if (e.relatedPlayerId) subbedIn.set(e.relatedPlayerId, e.minute);
    }
  }

  const statsByPlayer = new Map(match.playerStats.map((s) => [s.playerId, s]));

  const lineupFor = (teamId: string) => {
    const rows = match.lineups.filter((l) => l.teamId === teamId);
    const toPlayer = (l: (typeof rows)[number]) => ({
      player: {
        id: l.player.id,
        slug: l.player.slug,
        name: localized(l.player.name, l.player.nameEn, lang),
        photoUrl: l.player.photoUrl,
      },
      shirtNumber: l.shirtNumber,
      position: l.position as Position | null,
      isCaptain: l.isCaptain,
      gridX: l.gridX,
      gridY: l.gridY,
      card: cards.get(l.playerId) ?? null,
      goals: goals.get(l.playerId) ?? 0,
      ownGoals: ownGoals.get(l.playerId) ?? 0,
      assists: assists.get(l.playerId) ?? 0,
      subbedIn: subbedIn.get(l.playerId) ?? null,
      subbedOut: subbedOut.get(l.playerId) ?? null,
      rating: statsByPlayer.get(l.playerId)?.rating ?? null,
      stats: toPlayerMatchStats(statsByPlayer.get(l.playerId)),
    });
    return {
      starting: rows.filter((l) => l.isStarting).map(toPlayer),
      bench: rows.filter((l) => !l.isStarting).map(toPlayer),
    };
  };

  const statFor = (teamId: string) => {
    const s = match.stats.find((st) => st.teamId === teamId);
    if (!s) return null;
    const { id: _id, matchId: _m, teamId: _t, ...values } = s;
    return values;
  };
  const homeStats = statFor(match.homeTeamId);
  const awayStats = statFor(match.awayTeamId);
  const homeLineup = lineupFor(match.homeTeamId);
  const awayLineup = lineupFor(match.awayTeamId);

  // Player of the match once it's over (live ratings still move).
  const best = match.status === "FINISHED" ? playerOfTheMatch(match.playerStats) : null;
  const bestLineup = best ? match.lineups.find((l) => l.playerId === best.playerId) : undefined;

  const absences = Array.isArray(match.absences) ? (match.absences as unknown as Absence[]) : [];
  const absentSlugs = new Map(
    (
      await prisma.player.findMany({
        where: { externalId: { in: absences.map((a) => a.playerExternalId).filter((x): x is number => x != null) } },
        select: { externalId: true, slug: true, photoUrl: true },
      })
    ).map((p) => [p.externalId, p]),
  );
  const toAbsence = (a: Absence) => {
    const known = a.playerExternalId != null ? absentSlugs.get(a.playerExternalId) : undefined;
    return {
      name: localized(a.name, a.nameEn, lang),
      slug: known?.slug ?? null,
      photoUrl: known?.photoUrl ?? null,
      number: a.number,
      reason: lang === "ru" ? a.reason : a.reason ? translateAbsenceReason(a.reason) : null,
      matchesSuspended: a.matchesSuspended,
    };
  };
  const officials = Array.isArray(match.officials) ? (match.officials as unknown as Official[]) : [];

  return {
    ...toMatchSummary(match, lang),
    stadium: localized(match.stadium, match.stadiumEn, lang),
    city: localized(match.city, null, lang),
    referee: localized(match.referee, null, lang),
    attendance: match.attendance,
    youtubeUrl: match.youtubeUrl,
    highlightsUrl: match.highlightsUrl,
    events,
    lineups:
      homeLineup.starting.length + awayLineup.starting.length > 0
        ? {
            home: { formation: match.homeFormation, ...homeLineup },
            away: { formation: match.awayFormation, ...awayLineup },
          }
        : null,
    stats: homeStats && awayStats ? { home: homeStats, away: awayStats } : null,
    playerOfTheMatch:
      best && bestLineup
        ? {
            id: bestLineup.player.id,
            slug: bestLineup.player.slug,
            name: localized(bestLineup.player.name, bestLineup.player.nameEn, lang),
            photoUrl: bestLineup.player.photoUrl,
            rating: best.rating!,
            side: sideOf(best.teamId),
          }
        : null,
    coaches: {
      home: localized(match.homeCoach, match.homeCoachEn, lang),
      away: localized(match.awayCoach, match.awayCoachEn, lang),
    },
    officials: officials.map((o) => ({ role: o.role, name: localized(o.name, o.nameEn, lang) })),
    absences: {
      home: absences.filter((a) => a.side === "home").map(toAbsence),
      away: absences.filter((a) => a.side === "away").map(toAbsence),
    },
    broadcasters: Array.isArray(match.broadcasters) ? (match.broadcasters as unknown as BroadcasterDto[]) : [],
  };
}

// Suspension reasons come in Russian only; map the common ones.
const ABSENCE_REASONS_EN: [RegExp, string][] = [
  [/перебор ж[её]лтых/i, "Yellow card accumulation"],
  [/красн/i, "Red card"],
  [/дисквал/i, "Suspension"],
];
function translateAbsenceReason(reason: string): string {
  return ABSENCE_REASONS_EN.find(([re]) => re.test(reason))?.[1] ?? "Suspension";
}

/** The per-match player numbers shown in the player sheet; null when the source has none. */
export function toPlayerMatchStats(s: PlayerMatchStat | undefined) {
  if (!s) return null;
  return {
    minutes: s.minutes,
    goals: s.goals,
    assists: s.assists,
    shots: s.shots,
    shotsOnTarget: s.shotsOnTarget,
    xg: s.xg,
    passes: s.passes,
    passesAccurate: s.passesAccurate,
    keyPasses: s.keyPasses,
    crosses: s.crosses,
    dribbles: s.dribbles,
    dribblesWon: s.dribblesWon,
    tackles: s.tackles,
    interceptions: s.interceptions,
    recoveries: s.recoveries,
    duels: s.duels,
    duelsWon: s.duelsWon,
    fouls: s.fouls,
    foulsSuffered: s.foulsSuffered,
    offsides: s.offsides,
    saves: s.saves,
    goalsConceded: s.goalsConceded,
  };
}

export async function getHeadToHead(id: string, lang: Lang, limit = 10) {
  const match = await prisma.match.findUnique({ where: { id }, select: { id: true, homeTeamId: true, awayTeamId: true } });
  if (!match) throw notFound("Match");
  const { homeTeamId, awayTeamId } = match;

  const finished: MatchStatus = "FINISHED";
  const past = await prisma.match.findMany({
    where: {
      id: { not: match.id },
      status: finished,
      homeScore: { not: null },
      awayScore: { not: null },
      OR: [
        { homeTeamId, awayTeamId },
        { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
      ],
    },
    orderBy: { kickoff: "desc" },
    take: limit,
    include: matchSummaryInclude,
  });

  const summary = { homeWins: 0, awayWins: 0, draws: 0, total: past.length };
  for (const m of past) {
    if (m.homeScore === m.awayScore) summary.draws++;
    else if ((m.homeScore! > m.awayScore! ? m.homeTeamId : m.awayTeamId) === homeTeamId) summary.homeWins++;
    else summary.awayWins++;
  }
  return { summary, matches: past.map((m) => toMatchSummary(m, lang)) };
}
