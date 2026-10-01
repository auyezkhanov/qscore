// Mirrors the backend DTOs (backend/src/modules/**). All proper nouns arrive
// already localized for the `lang` the request was made with.

export type Lang = "ru" | "en";
export type Position = "GK" | "DF" | "MF" | "FW";
export type MatchStatus = "SCHEDULED" | "LIVE" | "HALFTIME" | "FINISHED" | "POSTPONED" | "CANCELLED";
export type FormResult = "W" | "D" | "L";

export type TeamRef = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  color: string;
};

/** A club that isn't in our database (e.g. a foreign transfer counterpart): not linkable. */
export type ExternalClubRef = { id: null; slug: null; name: string; logoUrl: string | null; color: string };

export type ClubRef = TeamRef | ExternalClubRef;

export type LeagueRef = { slug: string; name: string; tier: number };

export type League = LeagueRef & {
  country: string | null;
  season: { year: number; currentRound: number | null; totalRounds: number | null } | null;
};

export type MatchSummary = {
  id: string;
  round: number;
  /** ISO timestamp (UTC). */
  kickoff: string;
  /** Date is known but the kickoff time isn't fixed yet. */
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

export type NextMatchDay = { date: string | null; matches: MatchSummary[] };

export type EventType =
  | "GOAL"
  | "OWN_GOAL"
  | "PENALTY_GOAL"
  | "PENALTY_MISSED"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SECOND_YELLOW"
  | "SUBSTITUTION";

/** `id`/`slug` are null when the source named a person we couldn't link. */
export type PersonRef = { id: string | null; slug: string | null; name: string };

export type MatchEvent = {
  id: string;
  type: EventType;
  minute: number;
  addedTime: number | null;
  /** Side the event is shown on; own goals are already moved to the benefiting side. */
  side: "home" | "away";
  /** Running score after this goal (home, away); null for non-goal events. */
  score: [number, number] | null;
  /** Scorer / booked player / player coming OFF for substitutions. */
  player: PersonRef | null;
  /** Assist for goals / player coming ON for substitutions. */
  relatedPlayer: PersonRef | null;
};

export type LineupPlayer = {
  player: { id: string; slug: string; name: string; photoUrl: string | null };
  shirtNumber: number | null;
  position: Position | null;
  isCaptain: boolean;
  /**
   * Pitch coordinates 0..100 in the team's OWN frame (own goal at y=0, attacking towards y=100;
   * x=0 is the team's left). Null for substitutes. The away side must be mirrored when drawn.
   */
  gridX: number | null;
  gridY: number | null;
  card: "yellow" | "red" | null;
  goals: number;
  ownGoals: number;
  assists: number;
  subbedIn: number | null;
  subbedOut: number | null;
  /** Qscore rating 3.0–10.0 (live during the match); null when not rated. */
  rating: number | null;
  stats: PlayerMatchStats | null;
};

/** One player's numbers in one match. */
export type PlayerMatchStats = {
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  passes: number;
  passesAccurate: number;
  keyPasses: number;
  crosses: number;
  dribbles: number;
  dribblesWon: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  duels: number;
  duelsWon: number;
  fouls: number;
  foulsSuffered: number;
  offsides: number;
  saves: number;
  goalsConceded: number;
};

export type TeamLineup = { formation: string | null; starting: LineupPlayer[]; bench: LineupPlayer[] };

export type MatchTeamStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  offsides: number;
  yellowCards: number;
  redCards: number;
  passes: number;
  passAccuracy: number;
  saves: number | null;
  xg: number | null;
  keyPasses: number | null;
  crosses: number | null;
  shotsBlocked: number | null;
  shotsOnBar: number | null;
  freekicks: number | null;
  throwIns: number | null;
  passesToFinalThird: number | null;
  passesProgressive: number | null;
};

export type Broadcaster = { name: string; logoUrl: string | null; type: string | null; url: string | null };

export type Absence = {
  name: string;
  slug: string | null;
  photoUrl: string | null;
  number: number | null;
  reason: string | null;
  matchesSuspended: number | null;
};

/** referee roles: main, first_assistant, second_assistant, fourth_referee, var_main, var_assistant */
export type Official = { role: string; name: string };

export type MatchDetail = MatchSummary & {
  stadium: string | null;
  city: string | null;
  referee: string | null;
  attendance: number | null;
  youtubeUrl: string | null;
  highlightsUrl: string | null;
  events: MatchEvent[];
  lineups: { home: TeamLineup; away: TeamLineup } | null;
  stats: { home: MatchTeamStats; away: MatchTeamStats } | null;
  /** Only once the match is finished. */
  playerOfTheMatch: { id: string; slug: string; name: string; photoUrl: string | null; rating: number; side: "home" | "away" } | null;
  coaches: { home: string | null; away: string | null };
  officials: Official[];
  absences: { home: Absence[]; away: Absence[] };
  broadcasters: Broadcaster[];
};

export type FormEntry = { match: MatchSummary; result: FormResult };

export type MatchFact = {
  /** Rendered with the i18n key `fact.<key>`. */
  key: string;
  side: "home" | "away" | null;
  params: Record<string, string | number>;
};

export type MatchPreview = {
  form: { home: FormEntry[]; away: FormEntry[] };
  nextMatches: { home: MatchSummary | null; away: MatchSummary | null };
  teams: { home: TeamRef; away: TeamRef };
  facts: MatchFact[];
};

export type VoteChoice = "home" | "draw" | "away";
export type MatchVotes = { counts: Record<VoteChoice, number>; total: number; myVote: VoteChoice | null; open: boolean };

export type TvMatch = MatchSummary & { youtubeUrl: string | null; broadcasters: Broadcaster[] };

export type HeadToHead = {
  summary: { homeWins: number; awayWins: number; draws: number; total: number };
  matches: MatchSummary[];
};

export type StandingRow = {
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  /** Oldest first, most recent last. */
  form: FormResult[];
  /** e.g. "champion" | "euro_cups" | "relegation" | "promotion" | null */
  zone: string | null;
  team: TeamRef;
};

export type LeagueRounds = { currentRound: number | null; rounds: { round: number; matches: MatchSummary[] }[] };

export type TopPlayer = {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  position: Position;
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed: number;
  /** EUR, from Transfermarkt. */
  marketValue: number | null;
  team: TeamRef;
  /** The ranked figure: an average for "rating", a total otherwise. */
  value: number;
  /** Matches the figure is based on. */
  matches: number;
};

export type LeaderStat =
  | "goals"
  | "assists"
  | "marketValue"
  | "yellowCards"
  | "redCards"
  | "minutesPlayed"
  | "rating"
  | "xg"
  | "shots"
  | "shotsOnTarget"
  | "keyPasses"
  | "dribblesWon"
  | "tackles"
  | "interceptions"
  | "saves"
  | "cleanSheets";

export type TeamSeasonStats = {
  team: TeamRef;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsPerMatch: number;
  concededPerMatch: number;
  cleanSheets: number;
  possession: number | null;
  shotsPerMatch: number | null;
  shotsOnTargetPerMatch: number | null;
  xgFor: number | null;
  xgAgainst: number | null;
  passAccuracy: number | null;
  cornersPerMatch: number | null;
  yellowCards: number;
  redCards: number;
};

export type SeasonRef = { year: number; current: boolean };

/** A fixture from the season archive; `id` is set only when the match exists in our database. */
export type ArchivedMatch = {
  id: string | null;
  round: number;
  kickoff: string;
  timeTbd: boolean;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: ClubRef;
  awayTeam: ClubRef;
};

export type ArchivedStandingRow = Omit<StandingRow, "team"> & { team: ClubRef };

/** Transfermarkt fee classification; `amount` in EUR for FEE / LOAN_FEE. */
export type TransferFee = { type: "FEE" | "LOAN_FEE" | "LOAN" | "FREE" | "END_OF_LOAN" | "UNKNOWN"; amount: number | null };

export type Transfer = {
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
  fromTeam: ClubRef | null;
  toTeam: ClubRef | null;
  fee: TransferFee | null;
  /** Player market value at the time of the move (EUR). */
  marketValue: number | null;
  /** "tm" = move known only from Transfermarkt. */
  source: "kff" | "tm";
};

export type SquadPlayer = {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  position: Position;
  number: number | null;
  nationality: string | null;
  nationalityCode: string | null;
  age: number | null;
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed: number;
  marketValue: number | null;
};

export type CoachRecord = {
  name: string;
  current: boolean;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  /** % of matches won; null before the first finished match. */
  winRate: number | null;
  pointsPerMatch: number | null;
  /** YYYY-MM-DD of the first match in charge this season. */
  since: string;
};

export type TeamDetail = TeamRef & {
  city: string | null;
  /** Head coaches this season, current first. */
  coaches: CoachRecord[];
  stadium: { name: string; capacity: number | null; opened: number | null; surface: string | null } | null;
  league: LeagueRef | null;
  /** Total squad market value (EUR), from Transfermarkt. */
  squadValue: number | null;
  standing: {
    position: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  } | null;
  squad: SquadPlayer[];
  /** Last 5 finished, most recent first. */
  recentMatches: MatchSummary[];
  /** Next 5 not yet finished, soonest first. */
  upcomingMatches: MatchSummary[];
};

export type PlayerAdvancedStats = Partial<
  Record<
    | "secondYellowCards" | "xg" | "xgPer90" | "shots" | "shotsOnTarget" | "shotsBlocked" | "goalsOutOfBox"
    | "penaltyGoals" | "ownGoals" | "dribbles" | "dribblesSuccess" | "dribblesPer90" | "corners" | "offsides"
    | "passes" | "passesAccurate" | "passAccuracy" | "keyPasses" | "passesForward" | "passesProgressive"
    | "crosses" | "crossesAccurate" | "passesToBox" | "passesToFinalThird" | "tackles" | "tacklesPer90"
    | "interceptions" | "recoveries" | "duels" | "duelsWon" | "aerialDuels" | "aerialDuelsWon" | "groundDuels"
    | "groundDuelsWon" | "fouls" | "foulsSuffered" | "saves" | "saveRatio" | "penaltySaves" | "cleanSheets"
    | "goalsConceded" | "goalsConcededPenalty" | "exits" | "exitsSuccess",
    number | null
  >
>;

export type PlayerDetail = {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  position: Position;
  number: number | null;
  nationality: string | null;
  nationalityCode: string | null;
  birthDate: string | null;
  age: number | null;
  /** False when the player has left the club shown in `team`. */
  isActive: boolean;
  team: TeamRef;
  league: LeagueRef | null;
  seasonYear: number | null;
  season: {
    appearances: number;
    minutesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
  advancedStats: PlayerAdvancedStats | null;
  /** EUR, from Transfermarkt. */
  marketValue: number | null;
  /** YYYY-MM-DD */
  contractUntil: string | null;
  transfermarktUrl: string | null;
  heightCm: number | null;
  foot: "left" | "right" | "both" | null;
  /** Average Qscore rating this season. */
  rating: { average: number; matches: number } | null;
};

export type PlayerMatchLogEntry = {
  matchId: string;
  round: number;
  kickoff: string;
  opponent: TeamRef;
  isHome: boolean;
  homeScore: number | null;
  awayScore: number | null;
  started: boolean;
  played: boolean;
  minutes: number;
  goals: number;
  assists: number;
  yellowCard: boolean;
  redCard: boolean;
  cumulativeGoals: number;
  rating: number | null;
  stats: PlayerMatchStats | null;
};

export type MarketValueHistory = {
  current: number | null;
  highest: { date: string; value: number; club: string | null } | null;
  points: { date: string; value: number; club: string | null; age: number | null }[];
};

export type PredictionFixture = {
  match: MatchSummary;
  open: boolean;
  prediction: { homeScore: number; awayScore: number; points: number | null } | null;
};

export type LeaderboardRow = { rank: number; name: string; points: number; exact: number; outcomes: number; predictions: number; isMe: boolean };
export type PredictionLeaderboard = { total: number; top: LeaderboardRow[]; me: LeaderboardRow | null };

export type PushFollows = { teamIds: string[]; matchIds: string[] };

export type ComparisonMetrics = {
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed: number;
  cardPoints: number;
};

export type PlayerStats = {
  matchLog: PlayerMatchLogEntry[];
  positionComparison: { sampleSize: number; player: ComparisonMetrics; average: ComparisonMetrics; max: ComparisonMetrics };
};

export type PlayerCareer = {
  bio: {
    role: string | null;
    heightCm: number | null;
    weightKg: number | null;
    jerseyNumber: number | null;
    contractEnd: string | null;
  } | null;
  career: {
    year: number;
    league: LeagueRef;
    team: ClubRef | null;
    appearances: number;
    starts: number | null;
    minutesPlayed: number | null;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }[];
};

export type NewsSummary = {
  id: number;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  /** ISO date or timestamp. */
  publishedAt: string;
  leagueSlug: string | null;
  /** Language the text is actually in (English only when the server can translate). */
  lang: Lang;
};

export type NewsArticle = NewsSummary & { content: string | null; sourceUrl: string | null };

export type SearchResults = {
  teams: TeamRef[];
  players: { id: string; slug: string; name: string; photoUrl: string | null; position: Position; team: TeamRef }[];
};

export type AuthUser = { id: string; email: string };
export type AuthResponse = { token: string; user: AuthUser };

export type Health = { status: "ok" | "degraded"; ready: boolean; syncing: "full" | "live" | "transfermarkt" | null };
