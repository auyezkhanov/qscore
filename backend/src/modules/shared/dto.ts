import type { League, Match, MatchStatus, Team } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/http";
import { localized, type Lang } from "../../lib/i18n";

/** Columns needed to render a team reference anywhere in the UI. */
export const teamRefSelect = {
  id: true,
  slug: true,
  name: true,
  nameEn: true,
  primaryColor: true,
  logoUrl: true,
} as const;

type TeamRefRow = Pick<Team, keyof typeof teamRefSelect>;

export type TeamRef = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  color: string;
};

export function toTeamRef(t: TeamRefRow, lang: Lang): TeamRef {
  return { id: t.id, slug: t.slug, name: localized(t.name, t.nameEn, lang), logoUrl: t.logoUrl, color: t.primaryColor };
}

/** A club outside our database (e.g. a foreign transfer counterpart). */
export type ExternalClubRef = { id: null; slug: null; name: string; logoUrl: string | null; color: string };

export function leagueName(l: Pick<League, "name" | "nameEn">, lang: Lang) {
  return lang === "en" ? l.nameEn : l.name;
}

export type LeagueRef = { slug: string; name: string; tier: number };

export function toLeagueRef(l: Pick<League, "slug" | "name" | "nameEn" | "tier">, lang: Lang): LeagueRef {
  return { slug: l.slug, name: leagueName(l, lang), tier: l.tier };
}

export const matchSummaryInclude = {
  homeTeam: { select: teamRefSelect },
  awayTeam: { select: teamRefSelect },
  season: { select: { league: { select: { slug: true, name: true, nameEn: true, tier: true } } } },
} as const;

type MatchSummaryRow = Match & {
  homeTeam: TeamRefRow;
  awayTeam: TeamRefRow;
  season: { league: Pick<League, "slug" | "name" | "nameEn" | "tier"> };
};

export type MatchSummary = {
  id: string;
  round: number;
  kickoff: string;
  timeTbd: boolean;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  hasBroadcast: boolean;
  league: LeagueRef;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
};

export function toMatchSummary(m: MatchSummaryRow, lang: Lang): MatchSummary {
  return {
    id: m.id,
    round: m.round,
    kickoff: m.kickoff.toISOString(),
    timeTbd: m.timeTbd,
    status: m.status,
    minute: m.minute,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenaltyScore: m.homePenaltyScore,
    awayPenaltyScore: m.awayPenaltyScore,
    hasBroadcast: !!m.youtubeUrl || (Array.isArray(m.broadcasters) && m.broadcasters.length > 0),
    league: toLeagueRef(m.season.league, lang),
    homeTeam: toTeamRef(m.homeTeam, lang),
    awayTeam: toTeamRef(m.awayTeam, lang),
  };
}

/** Id of the league's current season; 404 when the league is unknown or not synced yet. */
export async function requireCurrentSeasonId(leagueSlug: string): Promise<string> {
  const season = await prisma.season.findFirst({
    where: { league: { slug: leagueSlug }, isCurrent: true },
    select: { id: true },
  });
  if (!season) throw notFound("League");
  return season.id;
}
