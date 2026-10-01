import type { League, Position, Prisma, Season } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/http";
import { countryName, localized, type Lang } from "../../lib/i18n";
import {
  leagueName,
  matchSummaryInclude,
  requireCurrentSeasonId,
  teamRefSelect,
  toMatchSummary,
  toTeamRef,
  type ExternalClubRef,
  type MatchSummary,
  type TeamRef,
} from "../shared/dto";
import { teamColor } from "../../integrations/kff/mappers";

/** Current/total round derived from the fixtures (the source's own "current round" lags behind). */
async function seasonRounds(season: Season) {
  const matches = await prisma.match.findMany({ where: { seasonId: season.id }, select: { round: true, kickoff: true, status: true } });
  const byRound = new Map<number, { kickoff: string; status: string }[]>();
  for (const m of matches) byRound.set(m.round, [...(byRound.get(m.round) ?? []), { kickoff: m.kickoff.toISOString(), status: m.status }]);
  const rounds = [...byRound.entries()].sort((a, b) => a[0] - b[0]).map(([round, list]) => ({ round, matches: list }));
  return {
    currentRound: pickCurrentRound(rounds) ?? season.currentRound,
    totalRounds: season.totalRounds ?? (rounds.length ? rounds[rounds.length - 1].round : null),
  };
}

async function toLeague(l: League & { seasons: Season[] }, lang: Lang) {
  const season = l.seasons[0] ?? null;
  const rounds = season ? await seasonRounds(season) : null;
  return {
    slug: l.slug,
    name: leagueName(l, lang),
    tier: l.tier,
    country: countryName(l.country, null, lang),
    season: season && rounds ? { year: season.year, ...rounds } : null,
  };
}

export async function listLeagues(lang: Lang) {
  const leagues = await prisma.league.findMany({
    orderBy: { tier: "asc" },
    include: { seasons: { where: { isCurrent: true } } },
  });
  return Promise.all(leagues.map((l) => toLeague(l, lang)));
}

export async function getLeague(slug: string, lang: Lang) {
  const league = await prisma.league.findUnique({ where: { slug }, include: { seasons: { where: { isCurrent: true } } } });
  if (!league) throw notFound("League");
  return toLeague(league, lang);
}

export async function getStandings(slug: string, lang: Lang) {
  const seasonId = await requireCurrentSeasonId(slug);
  const rows = await prisma.standing.findMany({
    where: { seasonId },
    orderBy: { position: "asc" },
    include: { team: { select: teamRefSelect } },
  });
  return rows.map((r) => ({
    position: r.position,
    played: r.played,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDiff: r.goalsFor - r.goalsAgainst,
    points: r.points,
    form: r.form ? (r.form.split(",") as ("W" | "D" | "L")[]) : [],
    zone: r.zone,
    team: toTeamRef(r.team, lang),
  }));
}

export async function getRounds(slug: string, lang: Lang) {
  const seasonId = await requireCurrentSeasonId(slug);
  const matches = await prisma.match.findMany({
    where: { seasonId },
    orderBy: [{ round: "asc" }, { kickoff: "asc" }],
    include: matchSummaryInclude,
  });

  const byRound = new Map<number, MatchSummary[]>();
  for (const m of matches) {
    const list = byRound.get(m.round) ?? [];
    list.push(toMatchSummary(m, lang));
    byRound.set(m.round, list);
  }
  const rounds = [...byRound.entries()].sort((a, b) => a[0] - b[0]).map(([round, list]) => ({ round, matches: list }));

  return { currentRound: pickCurrentRound(rounds), rounds };
}

/**
 * The round to show by default: the one with a live match, else the round
 * whose typical (median) date is the soonest that isn't more than two days
 * old, else the most recently played round. Medians keep a single rescheduled
 * fixture from dragging a round's date around, and rounds are compared by date
 * rather than number because the source schedules some rounds out of order.
 */
export function pickCurrentRound(rounds: { round: number; matches: { kickoff: string; status: string }[] }[], now = Date.now()) {
  if (rounds.length === 0) return null;
  const live = rounds.find((r) => r.matches.some((m) => m.status === "LIVE" || m.status === "HALFTIME"));
  if (live) return live.round;

  const threshold = now - 2 * 24 * 60 * 60 * 1000;
  const medians = rounds
    .filter((r) => r.matches.length > 0)
    .map((r) => {
      const times = r.matches.map((m) => Date.parse(m.kickoff)).sort((a, b) => a - b);
      return { round: r.round, median: times[Math.floor((times.length - 1) / 2)] };
    });
  const upcoming = medians.filter((m) => m.median >= threshold).sort((a, b) => a.median - b.median)[0];
  if (upcoming) return upcoming.round;
  return medians.sort((a, b) => b.median - a.median)[0]?.round ?? rounds[rounds.length - 1].round;
}

// ---------- transfers ----------

export const transferInclude = {
  team: { select: teamRefSelect },
  counterTeam: { select: teamRefSelect },
  player: { select: { slug: true } },
} as const;

type TransferRow = Prisma.TransferGetPayload<{ include: typeof transferInclude }>;

export type TransferDto = {
  id: string;
  direction: "IN" | "OUT";
  player: {
    slug: string | null;
    name: string;
    photoUrl: string | null;
    position: Position | null;
    age: number | null;
    nationality: string | null;
    nationalityCode: string | null;
  };
  fromTeam: TeamRef | ExternalClubRef | null;
  toTeam: TeamRef | ExternalClubRef | null;
  /** From Transfermarkt when known; amount in EUR. */
  fee: { type: string; amount: number | null } | null;
  /** Player market value (EUR) at the time of the move, from Transfermarkt. */
  marketValue: number | null;
  /** "tm" when kffleague.kz doesn't list this move and it comes from Transfermarkt only. */
  source: string;
};

export function toTransferDto(t: TransferRow, lang: Lang): TransferDto {
  const self = toTeamRef(t.team, lang);
  const counterName = t.counterTeamName ?? t.tmCounterTeamName;
  const counter: TeamRef | ExternalClubRef | null = t.counterTeam
    ? toTeamRef(t.counterTeam, lang)
    : counterName
      ? {
          id: null,
          slug: null,
          name: localized(counterName, null, lang),
          logoUrl: t.counterTeamName ? t.counterTeamLogo : null,
          color: teamColor(counterName),
        }
      : null;
  return {
    id: t.id,
    direction: t.direction,
    player: {
      slug: t.player?.slug ?? null,
      name: localized(t.playerName, t.playerNameEn, lang),
      photoUrl: t.playerPhotoUrl,
      position: t.playerPosition,
      age: t.playerAge,
      nationality: countryName(t.playerNationalityCode, t.playerNationality, lang),
      nationalityCode: t.playerNationalityCode,
    },
    fee: t.feeType ? { type: t.feeType, amount: t.feeAmount } : null,
    marketValue: t.marketValue,
    source: t.source,
    fromTeam: t.direction === "IN" ? counter : self,
    toTeam: t.direction === "IN" ? self : counter,
  };
}

/** Interleaves clubs so a single busy club can't dominate the top of the feed. */
function roundRobinByTeam<T extends { teamId: string }>(rows: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const r of rows) groups.set(r.teamId, [...(groups.get(r.teamId) ?? []), r]);
  const lists = [...groups.values()];
  const out: T[] = [];
  for (let i = 0; out.length < rows.length; i++) {
    for (const list of lists) if (list[i]) out.push(list[i]);
  }
  return out;
}

export async function getLeagueTransfers(
  slug: string,
  opts: { team?: string; position?: Position; sort: "recent" | "fee"; limit: number },
  lang: Lang,
) {
  const seasonId = await requireCurrentSeasonId(slug);
  const leagueTeamIds = (await prisma.standing.findMany({ where: { seasonId }, select: { teamId: true } })).map((s) => s.teamId);

  // Arrivals, plus departures to clubs outside the league (a move between two
  // league clubs already appears as the buying club's arrival).
  const where: Prisma.TransferWhereInput = {
    seasonId,
    OR: [
      { direction: "IN" },
      { direction: "OUT", OR: [{ counterTeamId: null }, { counterTeamId: { notIn: leagueTeamIds } }] },
    ],
    ...(opts.position ? { playerPosition: opts.position } : {}),
  };
  if (opts.team) {
    const team = await prisma.team.findUnique({ where: { slug: opts.team }, select: { id: true } });
    if (!team) throw notFound("Team");
    where.AND = [{ OR: [{ teamId: team.id }, { counterTeamId: team.id }] }];
  }

  const rows = await prisma.transfer.findMany({ where, orderBy: [{ createdAt: "desc" }, { playerName: "asc" }], include: transferInclude });
  const ordered = opts.sort === "fee" ? [...rows].sort(byFee) : roundRobinByTeam(rows);
  return ordered.slice(0, opts.limit).map((t) => toTransferDto(t, lang));
}

/** Biggest fee first; moves without a fee follow, ordered by the player's market value. */
function byFee(a: TransferRow, b: TransferRow) {
  return (b.feeAmount ?? -1) - (a.feeAmount ?? -1) || (b.marketValue ?? -1) - (a.marketValue ?? -1);
}
