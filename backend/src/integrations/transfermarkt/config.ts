/** Transfermarkt competition code for the Kazakhstan Premier League. */
export const TM_COMPETITION = "KAS1";

/**
 * Transfermarkt labels a calendar-year league's season by the year it starts
 * in the European sense: "Premier Liga 2026" is saison_id 2025.
 */
export const tmSeasonId = (seasonYear: number) => seasonYear - 1;

// Transfermarkt club id -> our club by its kffleague.kz team id (stable across
// renames and re-syncs). Names differ too much between the sources to match
// automatically; update this list when clubs are promoted or relegated.
export const TM_CLUBS: Record<number, { kffTeamId: number; name: string }> = {
  10482: { kffTeamId: 13, name: "Кайрат" },
  22220: { kffTeamId: 91, name: "Астана" },
  10481: { kffTeamId: 90, name: "Тобыл" },
  31007: { kffTeamId: 93, name: "Елимай" },
  10157: { kffTeamId: 51, name: "Актобе" },
  12019: { kffTeamId: 92, name: "Женис" },
  16779: { kffTeamId: 81, name: "Ордабасы" },
  19662: { kffTeamId: 318, name: "Окжетпес" },
  22995: { kffTeamId: 87, name: "Кызылжар" },
  107095: { kffTeamId: 293, name: "Улытау" },
  19294: { kffTeamId: 94, name: "Кайсар" },
  15299: { kffTeamId: 45, name: "Жетысу" },
  16198: { kffTeamId: 49, name: "Атырау" },
  34239: { kffTeamId: 47, name: "Каспий" },
  10540: { kffTeamId: 595, name: "Иртыш" },
  118378: { kffTeamId: 295, name: "Алтай" },
};
