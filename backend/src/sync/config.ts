export type LeagueConfig = {
  slug: string;
  /** Championship key in kffleague.kz's front-map. */
  code: string;
  name: string;
  nameEn: string;
  tier: number;
};

// Some players are registered with both a senior club and its reserve side in
// the lower tier (e.g. "Тобыл" / "Тобыл М"). Rosters are upserted by the
// player's external id, last write wins — so the top tier is synced last on
// purpose: on a conflict the senior club keeps the player.
export const LEAGUES: LeagueConfig[] = [
  { slug: "birinshi-liga", code: "1l", name: "Первая лига", nameEn: "First League", tier: 2 },
  { slug: "kpl", code: "pl", name: "Премьер-лига", nameEn: "Premier League", tier: 1 },
];

export const LEAGUE_BY_CODE = new Map(LEAGUES.map((l) => [l.code, l]));
export const LEAGUE_BY_SLUG = new Map(LEAGUES.map((l) => [l.slug, l]));

/** Pause between upstream calls so a sync never hammers the source site. */
export const REQUEST_GAP_MS = 120;
/** Finished matches younger than this get their details re-synced (late corrections). */
export const RECENT_MATCH_RESYNC_MS = 3 * 24 * 60 * 60 * 1000;
