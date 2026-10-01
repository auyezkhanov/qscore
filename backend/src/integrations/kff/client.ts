import type {
  FrontMap,
  Game,
  GameDetail,
  GameLineup,
  GamesPage,
  GameStats,
  KffLang,
  NewsArticle,
  NewsList,
  PlayerProfile,
  PlayerSeasonStats,
  PlayerStatRow,
  RosterPlayer,
  TableRow,
  TeamInfo,
  TeamTransfers,
} from "./types";

import { createLimiter } from "../../lib/limiter";

const BASE = "https://kffleague.kz/api/v1";
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 15_000;
const RETRIES = 2;

export class KffError extends Error {
  constructor(
    public readonly path: string,
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Shared by the sync and by user-triggered lookups (careers, news, archive).
const limit = createLimiter(4, 50);

function getJson<T>(path: string): Promise<T> {
  return limit(() => fetchJson<T>(path));
}

async function fetchJson<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 404) throw new KffError(path, 404, `kff ${path} -> 404`);
      if (!res.ok) throw new KffError(path, res.status, `kff ${path} -> HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      // A 404 is a definitive answer; retrying won't change it.
      if (err instanceof KffError && err.status === 404) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new KffError(path, null, String(lastError));
}

export const kff = {
  frontMap: () => getJson<FrontMap>("/championships/front-map"),

  table: (seasonId: number, lang: KffLang = "ru") =>
    getJson<{ table: TableRow[] }>(`/seasons/${seasonId}/table?lang=${lang}`),

  async games(seasonId: number): Promise<Game[]> {
    const games: Game[] = [];
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const page = await getJson<GamesPage>(
        `/games?season_id=${seasonId}&group_by_date=true&lang=ru&limit=${limit}&offset=${offset}`,
      );
      for (const group of page.groups) games.push(...group.games);
      if (offset + limit >= page.total || page.groups.length === 0) break;
      await sleep(120);
    }
    return games;
  },

  gameDetail: (gameId: number) => getJson<GameDetail>(`/games/${gameId}?lang=ru`),
  gameLineup: (gameId: number, lang: KffLang = "ru") => getJson<GameLineup>(`/games/${gameId}/lineup?lang=${lang}`),
  gameStats: (gameId: number) => getJson<GameStats>(`/games/${gameId}/stats?lang=ru`),

  teamPlayerStats: (seasonId: number, teamId: number, lang: KffLang = "ru") =>
    getJson<{ items: PlayerStatRow[] }>(
      `/seasons/${seasonId}/player-stats?team_id=${teamId}&sort_by=games_played&limit=100&offset=0&lang=${lang}`,
    ),

  teamRoster: (seasonId: number, teamId: number, lang: KffLang = "ru") =>
    getJson<{ items: RosterPlayer[] }>(`/teams/${teamId}/players?season_id=${seasonId}&lang=${lang}`),

  teamTransfers: (seasonId: number, teamId: number, lang: KffLang = "ru") =>
    getJson<TeamTransfers>(`/teams/${teamId}/transfers?season_id=${seasonId}&lang=${lang}`),

  teamInfo: (teamId: number) => getJson<TeamInfo>(`/teams/${teamId}?lang=ru`),

  news(params: { championshipCode?: string; limit?: number } = {}) {
    const q = new URLSearchParams({ lang: "ru" });
    if (params.championshipCode) q.set("championship_code", params.championshipCode);
    if (params.limit) q.set("limit", String(params.limit));
    return getJson<NewsList>(`/news?${q.toString()}`);
  },

  newsArticle: (id: number) => getJson<NewsArticle>(`/news/${id}?lang=ru`),

  playerProfile: (playerId: number, lang: KffLang = "ru") => getJson<PlayerProfile>(`/players/${playerId}?lang=${lang}`),

  playerSeasonStats: (playerId: number, seasonId: number) =>
    getJson<PlayerSeasonStats | null>(`/players/${playerId}/stats?season_id=${seasonId}&lang=ru`),
};
