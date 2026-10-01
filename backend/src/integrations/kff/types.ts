// Response shapes of kffleague.kz's public JSON API (undocumented — only the
// fields we actually use are typed; everything is treated as nullable-ish).

export type KffLang = "ru" | "en";

export type Country = { code?: string | null; name?: string | null } | null;

export type ChampionshipSeasonRef = { season_id: number; year: number; name: string };

export type ChampionshipEntry = {
  season_id: number;
  name: string;
  tournament_type: string;
  current_round: number | null;
  total_rounds: number | null;
  seasons?: ChampionshipSeasonRef[];
};

export type FrontMap = { items: Record<string, ChampionshipEntry | undefined> };

export type TableRow = {
  position: number;
  team_id: number;
  team_name: string;
  team_logo: string | null;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  points: number;
  form: string | null;
  zone: string | null;
};

export type GameTeamRef = {
  id: number;
  name: string;
  name_en?: string | null;
  logo_url: string | null;
};

export type GameStadium = {
  id?: number;
  name: string | null;
  name_en?: string | null;
  city: string | null;
  capacity?: number | null;
  field_type?: string | null;
} | null;

export type Game = {
  id: number;
  date: string;
  time: string | null;
  tour: number | null;
  home_team: GameTeamRef;
  away_team: GameTeamRef;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  stadium: GameStadium;
  visitors?: number | null;
  is_live: boolean;
  has_stats: boolean;
  has_lineup: boolean;
  is_schedule_tentative?: boolean;
  status: string;
  live_phase?: string | null;
  minute: number | null;
  half?: number | null;
  youtube_live_url?: string | null;
  video_review_url?: string | null;
  broadcasters?: Broadcaster[] | null;
};

export type GamesPage = { groups: { date: string; games: Game[] }[]; total: number };

export type GameDetail = {
  id: number;
  referee: string | null;
  youtube_live_url: string | null;
  video_review_url?: string | null;
  status: string;
};

export type LineupPlayerEntry = {
  player_id: number;
  first_name: string;
  last_name: string;
  country: Country;
  shirt_number: number | null;
  is_captain: boolean;
  amplua: string | null;
  field_position: string | null;
  photo_url: string | null;
};

export type TeamLineup = {
  team_id: number;
  formation: string | null;
  starters: LineupPlayerEntry[];
  substitutes: LineupPlayerEntry[];
};

export type GameLineup = GameLineupExtras & {
  has_lineup: boolean;
  lineups: { home_team: TeamLineup; away_team: TeamLineup } | null;
};

export type TeamMatchStats = {
  team_id: number;
  possession_percent: number | null;
  shots: number | null;
  shots_on_goal: number | null;
  passes: number | null;
  pass_accuracy: number | null;
  fouls: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  corners: number | null;
  offsides: number | null;
  saves?: number | null;
  xg?: number | null;
  key_passes?: number | null;
  crosses?: number | null;
  shots_blocked?: number | null;
  shots_on_bar?: number | null;
  freekicks?: number | null;
  throw_ins?: number | null;
  passes_to_final_third?: number | null;
  passes_progressive?: number | null;
};

export type MatchEventRaw = {
  id: number;
  half: number | null;
  minute: number;
  event_type: string;
  team_id: number;
  player_id: number | null;
  player_name: string | null;
  player_number: number | null;
  player2_id: number | null;
  player2_name: string | null;
  player2_number: number | null;
};

export type GameStats = {
  team_stats: TeamMatchStats[];
  events: MatchEventRaw[];
  player_stats?: PlayerMatchStatRaw[] | null;
};

export type PlayerStatRow = {
  player_id: number;
  first_name: string;
  last_name: string;
  country: Country;
  team_id: number;
  position_code: string | null;
  player_type: string | null;
  games_played: number;
  time_on_field_total: number | null;
  goal: number;
  goal_pass: number;
  yellow_cards: number;
  red_cards: number;
  photo_url: string | null;
  photo_url_avatar: string | null;
  [key: string]: unknown;
};

export type RosterPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  birthday: string | null;
  player_type: string | null;
  position: string | null;
  country: Country;
  photo_url: string | null;
  photo_url_avatar: string | null;
  number: number | null;
};

export type TransferPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  position: string | null;
  age: number | null;
  country: Country;
};

export type TransferClub = { id: number; name: string; logo_url: string | null } | null;

export type TeamTransfers = {
  arrivals: { player: TransferPlayer; from_team: TransferClub }[];
  departures: { player: TransferPlayer; to_team: TransferClub }[];
};

export type NewsListItem = {
  id: number;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  championship_code: string | null;
  publish_date: string;
};

export type NewsList = { items: NewsListItem[]; total: number };

export type NewsArticle = NewsListItem & { content: string | null; source_url: string | null };

export type PlayerProfile = {
  id: number;
  top_role: string | null;
  jersey_number: number | null;
  height: number | null;
  weight: number | null;
  contract_end: string | null;
};

export type PlayerSeasonStats = {
  season_id: number;
  team_id: number;
  games_played: number;
  games_starting: number | null;
  time_on_field_total: number | null;
  goal: number;
  goal_pass: number;
  yellow_cards: number;
  red_cards: number;
};

export type TeamInfo = { id: number; name: string; logo_url: string | null };

export type LineupPerson = {
  id?: number;
  first_name: string | null;
  last_name: string | null;
  role?: string | null;
  country?: Country;
};

export type Suspension = {
  offender_type?: string;
  player_id: number | null;
  first_name: string | null;
  last_name: string | null;
  shirt_number: number | null;
  reason_label: string | null;
  matches_suspended: number | null;
};

/** Extra blocks the lineup endpoint carries besides the lineups themselves. */
export type GameLineupExtras = {
  referees?: LineupPerson[] | null;
  coaches?: { home_team?: LineupPerson[]; away_team?: LineupPerson[] } | null;
  suspensions?: { home_team?: Suspension[]; away_team?: Suspension[] } | null;
};

export type Broadcaster = { name: string; logo_url: string | null; type: string | null; website: string | null };

export type PlayerMatchStatRaw = {
  player_id: number;
  team_id: number;
  minutes_played: number | null;
  goals: number | null;
  assists: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  extra_stats?: Record<string, unknown> | null;
};
