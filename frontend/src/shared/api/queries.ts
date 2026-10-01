import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { dayRange } from "@/shared/lib/date";
import { API_BASE_URL, request } from "./client";
import { isLive } from "@/shared/lib/match";
import type {
  ArchivedMatch,
  ArchivedStandingRow,
  LeaderStat,
  MarketValueHistory,
  MatchPreview,
  MatchVotes,
  PredictionFixture,
  PredictionLeaderboard,
  SeasonRef,
  TeamSeasonStats,
  TvMatch,
  HeadToHead,
  League,
  LeagueRounds,
  MatchDetail,
  MatchSummary,
  NewsArticle,
  NewsSummary,
  NextMatchDay,
  PlayerCareer,
  PlayerDetail,
  PlayerStats,
  Position,
  SearchResults,
  StandingRow,
  TeamDetail,
  TeamRef,
  TopPlayer,
  Transfer,
} from "./types";

// Every localized resource carries `lang` in its query key, so switching the
// language fetches the other variant instead of showing stale names.

/** Poll interval while live data matters (scores, minute, events). */
export const LIVE_REFETCH_MS = 30_000;


export function useLeagues() {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["leagues", lang],
    queryFn: ({ signal }) => request<League[]>("/leagues", { lang, signal }),
    staleTime: 5 * 60_000,
  });
}

export function useLeague(slug: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["league", slug, lang],
    queryFn: ({ signal }) => request<League>(`/leagues/${slug}`, { lang, signal }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useStandings(slug: string | null | undefined) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["standings", slug, lang],
    queryFn: ({ signal }) => request<StandingRow[]>(`/leagues/${slug}/standings`, { lang, signal }),
    enabled: !!slug,
    refetchInterval: 60_000,
  });
}

export function useLeagueRounds(slug: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["league-rounds", slug, lang],
    queryFn: ({ signal }) => request<LeagueRounds>(`/leagues/${slug}/rounds`, { lang, signal }),
    enabled: !!slug,
    refetchInterval: (q) => (q.state.data?.rounds.some((r) => r.matches.some(isLive)) ? LIVE_REFETCH_MS : 5 * 60_000),
  });
}

/** Any leaderboard the API supports (see LeaderStat). */
export type TopStat = LeaderStat;

export function useTopPlayers(slug: string | null | undefined, stat: TopStat, limit = 20) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["top-players", slug, stat, limit, lang],
    queryFn: ({ signal }) => request<TopPlayer[]>(`/leagues/${slug}/top-players`, { query: { stat, limit }, lang, signal }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export function useLeagueTransfers(slug: string, filters: { team?: string; position?: Position; sort?: "recent" | "fee" }) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["league-transfers", slug, filters.team ?? null, filters.position ?? null, filters.sort ?? "recent", lang],
    queryFn: ({ signal }) => request<Transfer[]>(`/leagues/${slug}/transfers`, { query: filters, lang, signal }),
    enabled: !!slug,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Matches on the viewer's local calendar day. */
export function useMatchesOnDay(day: Date) {
  const { lang } = useI18n();
  const range = dayRange(day);
  return useQuery({
    queryKey: ["matches", range.from, lang],
    queryFn: ({ signal }) => request<MatchSummary[]>("/matches", { query: range, lang, signal }),
    refetchInterval: (q) => (q.state.data?.some(isLive) ? LIVE_REFETCH_MS : 2 * 60_000),
    placeholderData: keepPreviousData,
  });
}

/** First local day after `after` that has fixtures (used when a day is empty). */
export function useNextMatchDay(after: Date, enabled = true) {
  const { lang } = useI18n();
  const afterIso = after.toISOString();
  return useQuery({
    queryKey: ["next-match-day", afterIso, lang],
    queryFn: ({ signal }) =>
      request<NextMatchDay>("/matches/next-day", {
        query: { after: afterIso, tzOffset: new Date().getTimezoneOffset() },
        lang,
        signal,
      }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useMatch(id: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["match", id, lang],
    queryFn: ({ signal }) => request<MatchDetail>(`/matches/${id}`, { lang, signal }),
    enabled: !!id,
    refetchInterval: (q) => {
      const m = q.state.data;
      if (!m) return false;
      if (isLive(m)) return LIVE_REFETCH_MS;
      // Poll a little before kick-off so the lineups/"live" state show up on their own.
      const untilKickoff = new Date(m.kickoff).getTime() - Date.now();
      return m.status === "SCHEDULED" && untilKickoff < 2 * 60 * 60_000 ? 60_000 : false;
    },
  });
}

export function useHeadToHead(id: string, enabled = true) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["h2h", id, lang],
    queryFn: ({ signal }) => request<HeadToHead>(`/matches/${id}/h2h`, { lang, signal }),
    enabled: !!id && enabled,
    staleTime: 10 * 60_000,
  });
}

export function useTeams(league?: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["teams", league ?? null, lang],
    queryFn: ({ signal }) => request<TeamRef[]>("/teams", { query: { league }, lang, signal }),
    staleTime: 30 * 60_000,
  });
}

export function useTeam(slug: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["team", slug, lang],
    queryFn: ({ signal }) => request<TeamDetail>(`/teams/${slug}`, { lang, signal }),
    enabled: !!slug,
    refetchInterval: (q) => (q.state.data?.upcomingMatches.some(isLive) ? LIVE_REFETCH_MS : false),
  });
}

export function useTeamMatches(slug: string, enabled = true) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["team-matches", slug, lang],
    queryFn: ({ signal }) => request<MatchSummary[]>(`/teams/${slug}/matches`, { lang, signal }),
    enabled: !!slug && enabled,
    staleTime: 60_000,
  });
}

export function useTeamTransfers(slug: string, enabled = true) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["team-transfers", slug, lang],
    queryFn: ({ signal }) => request<Transfer[]>(`/teams/${slug}/transfers`, { lang, signal }),
    enabled: !!slug && enabled,
    staleTime: 10 * 60_000,
  });
}

export function usePlayer(slug: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["player", slug, lang],
    queryFn: ({ signal }) => request<PlayerDetail>(`/players/${slug}`, { lang, signal }),
    enabled: !!slug,
  });
}

export function usePlayerStats(slug: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["player-stats", slug, lang],
    queryFn: ({ signal }) => request<PlayerStats>(`/players/${slug}/stats`, { lang, signal }),
    enabled: !!slug,
  });
}

export function usePlayerCareer(slug: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["player-career", slug, lang],
    queryFn: ({ signal }) => request<PlayerCareer>(`/players/${slug}/career`, { lang, signal }),
    enabled: !!slug,
    staleTime: 30 * 60_000,
    retry: 1,
  });
}

export function useNews(params: { league?: string; limit?: number } = {}) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["news", params.league ?? null, params.limit ?? 20, lang],
    queryFn: ({ signal }) => request<NewsSummary[]>("/news", { query: params, lang, signal }),
    staleTime: 3 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useNewsArticle(id: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["news-article", id, lang],
    queryFn: ({ signal }) => request<NewsArticle>(`/news/${id}`, { lang, signal }),
    enabled: /^\d+$/.test(id),
    staleTime: 15 * 60_000,
  });
}

export function useSearch(q: string) {
  const { lang } = useI18n();
  const term = q.trim();
  return useQuery({
    queryKey: ["search", term.toLowerCase(), lang],
    queryFn: ({ signal }) => request<SearchResults>("/search", { query: { q: term }, lang, signal }),
    enabled: term.length >= 2,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

// ---------- match extras ----------

export function useMatchPreview(id: string, enabled = true) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["match-preview", id, lang],
    queryFn: ({ signal }) => request<MatchPreview>(`/matches/${id}/preview`, { lang, signal }),
    enabled: !!id && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useTvSchedule(days = 14) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["tv", days, lang],
    queryFn: ({ signal }) => request<TvMatch[]>("/matches/tv", { query: { days }, lang, signal }),
    staleTime: 5 * 60_000,
  });
}

// ---------- league extras ----------

export function useTeamStats(slug: string, enabled = true) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["team-stats", slug, lang],
    queryFn: ({ signal }) => request<TeamSeasonStats[]>(`/leagues/${slug}/team-stats`, { lang, signal }),
    enabled: !!slug && enabled,
    staleTime: 10 * 60_000,
  });
}

export function useSeasons(slug: string) {
  return useQuery({
    queryKey: ["seasons", slug],
    queryFn: ({ signal }) => request<SeasonRef[]>(`/leagues/${slug}/seasons`, { signal }),
    enabled: !!slug,
    staleTime: 60 * 60_000,
  });
}

export function useArchivedStandings(slug: string, year: number | null) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["archive-standings", slug, year, lang],
    queryFn: ({ signal }) => request<ArchivedStandingRow[]>(`/leagues/${slug}/seasons/${year}/standings`, { lang, signal }),
    enabled: !!slug && year != null,
    staleTime: 60 * 60_000,
  });
}

export function useArchivedRounds(slug: string, year: number | null, enabled = true) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["archive-rounds", slug, year, lang],
    queryFn: ({ signal }) => request<{ round: number; matches: ArchivedMatch[] }[]>(`/leagues/${slug}/seasons/${year}/rounds`, { lang, signal }),
    enabled: !!slug && year != null && enabled,
    staleTime: 60 * 60_000,
  });
}

// ---------- player extras ----------

export function useMarketValueHistory(slug: string, enabled = true) {
  return useQuery({
    queryKey: ["market-value", slug],
    queryFn: ({ signal }) => request<MarketValueHistory>(`/players/${slug}/market-value`, { signal }),
    enabled: !!slug && enabled,
    staleTime: 6 * 60 * 60_000,
    retry: 1,
  });
}

// ---------- predictor ----------

export function usePredictionFixtures() {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ["prediction-fixtures", lang],
    queryFn: ({ signal }) => request<PredictionFixture[]>("/predictions/fixtures", { lang, signal }),
    staleTime: 60_000,
  });
}

export function usePredictionLeaderboard() {
  return useQuery({
    queryKey: ["prediction-leaderboard"],
    queryFn: ({ signal }) => request<PredictionLeaderboard>("/predictions/leaderboard", { signal }),
    staleTime: 60_000,
  });
}

/** Absolute URL of a fixtures calendar feed (subscribe with webcal:// or download). */
export function calendarUrl(kind: "teams" | "leagues", slug: string, lang: "ru" | "en"): string {
  const path = `${API_BASE_URL}/calendar/${kind}/${slug}.ics?lang=${lang}`;
  return new URL(path, window.location.origin).toString();
}

// ---------- "who will win?" poll ----------

const VOTER_KEY = "qscore:voter";

// Used when storage is blocked (private mode): unique per tab instead of one id shared by everyone.
let fallbackVoterId: string | null = null;

// crypto.randomUUID only exists in secure contexts (https/localhost).
const randomId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Anonymous per-device id so guests can vote once per match. */
export function voterId(): string {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    fallbackVoterId ??= randomId();
    return fallbackVoterId;
  }
}

export function useMatchVotes(id: string, enabled = true) {
  return useQuery({
    queryKey: ["votes", id],
    queryFn: ({ signal }) => request<MatchVotes>(`/matches/${id}/votes`, { signal, headers: { "X-Voter-Id": voterId() } }),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function castVote(id: string, choice: "home" | "draw" | "away") {
  return request<MatchVotes>(`/matches/${id}/votes`, { method: "POST", body: { choice }, headers: { "X-Voter-Id": voterId() } });
}
