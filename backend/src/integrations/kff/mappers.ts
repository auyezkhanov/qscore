import type { EventType, MatchStatus, Position } from "@prisma/client";
import type { Country, Game } from "./types";

/** Kazakhstan has been on a single UTC+5 time zone since March 2024. */
const KZ_OFFSET = "+05:00";

export function parseKickoff(date: string, time: string | null | undefined): { kickoff: Date; timeTbd: boolean } | null {
  const hasTime = !!time && /^\d{2}:\d{2}/.test(time);
  const kickoff = new Date(`${date}T${hasTime ? time!.slice(0, 5) : "12:00"}:00${KZ_OFFSET}`);
  if (Number.isNaN(kickoff.getTime())) return null;
  return { kickoff, timeTbd: !hasTime };
}

export function mapGameStatus(g: Pick<Game, "status" | "is_live" | "minute" | "live_phase" | "half">): {
  status: MatchStatus;
  minute: number | null;
} {
  const status = (g.status ?? "").toLowerCase();
  if (status === "finished" || status === "technical_defeat") return { status: "FINISHED", minute: null };
  if (status === "postponed") return { status: "POSTPONED", minute: null };
  if (status === "cancelled" || status === "canceled") return { status: "CANCELLED", minute: null };
  if (g.is_live || status === "live") {
    const phase = (g.live_phase ?? "").toLowerCase();
    if (phase.includes("half") || phase.includes("break") || phase === "ht") return { status: "HALFTIME", minute: null };
    return { status: "LIVE", minute: g.minute ?? null };
  }
  return { status: "SCHEDULED", minute: null };
}

const POSITION_BY_CODE: Record<string, Position> = { GK: "GK", DEF: "DF", MID: "MF", FWD: "FW" };
const POSITION_BY_TYPE: Record<string, Position> = {
  goalkeeper: "GK",
  defence: "DF",
  halfback: "MF",
  offence: "FW",
};
const POSITION_BY_AMPLUA: Record<string, Position> = { Gk: "GK", D: "DF", DM: "MF", M: "MF", AM: "MF", F: "FW" };

export function mapPosition(code?: string | null, playerType?: string | null, amplua?: string | null): Position {
  return (
    (code && POSITION_BY_CODE[code]) ||
    (playerType && POSITION_BY_TYPE[playerType]) ||
    (amplua && POSITION_BY_AMPLUA[amplua]) ||
    "MF"
  );
}

// Pitch coordinates (0..100) for the home side attacking "upwards"; the away
// side is mirrored by the caller.
const AMPLUA_DEPTH: Record<string, number> = { Gk: 5, D: 22, DM: 36, M: 50, AM: 64, F: 80 };
const FIELD_CROSS: Record<string, number> = { L: 15, LC: 32, C: 50, RC: 68, R: 85 };

export function lineupGrid(amplua: string | null | undefined, fieldPosition: string | null | undefined) {
  return {
    x: FIELD_CROSS[fieldPosition ?? ""] ?? 50,
    y: AMPLUA_DEPTH[amplua ?? ""] ?? 50,
  };
}

const EVENT_TYPES: Record<string, EventType> = {
  goal: "GOAL",
  own_goal: "OWN_GOAL",
  penalty: "PENALTY_GOAL",
  missed_penalty: "PENALTY_MISSED",
  yellow_card: "YELLOW_CARD",
  red_card: "RED_CARD",
  second_yellow: "SECOND_YELLOW",
  substitution: "SUBSTITUTION",
};

export function mapEventType(raw: string): EventType | null {
  return EVENT_TYPES[raw] ?? null;
}

/**
 * The source reports stoppage time as a raw minute (e.g. 47 in the first half).
 * Split it into the regulation minute plus added time: 47' (half 1) -> 45'+2.
 */
export function splitMinute(minute: number, half: number | null | undefined): { minute: number; addedTime: number | null } {
  const limit = half === 1 ? 45 : half === 2 ? 90 : half === 3 ? 105 : half === 4 ? 120 : null;
  if (limit !== null && minute > limit) return { minute: limit, addedTime: minute - limit };
  return { minute, addedTime: null };
}

/** "WDLWW" -> "W,D,L,W,W" (only W/D/L kept). */
export function normalizeForm(form: string | null | undefined): string {
  return (form ?? "")
    .toUpperCase()
    .split("")
    .filter((c) => c === "W" || c === "D" || c === "L")
    .join(",");
}

export function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return `${first ?? ""} ${last ?? ""}`.replace(/\s+/g, " ").trim();
}

export function countryCode(country: Country): string | null {
  const code = country?.code?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

// Club colours for known teams; anything else gets a stable hashed colour.
const TEAM_COLORS: Record<string, string> = {
  Ордабасы: "#16A34A",
  Кайрат: "#EAB308",
  Астана: "#0EA5E9",
  Окжетпес: "#1D4ED8",
  Актобе: "#DC2626",
  Елимай: "#0891B2",
  Улытау: "#7C3AED",
  Женис: "#0284C7",
  Тобыл: "#1E40AF",
  Каспий: "#0369A1",
  Кызылжар: "#B91C1C",
  Атырау: "#B45309",
  Иртыш: "#334155",
  Кайсар: "#0D9488",
  Алтай: "#65A30D",
  Жетысу: "#EA580C",
};

const FALLBACK_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
];

export function teamColor(name: string): string {
  if (TEAM_COLORS[name]) return TEAM_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Extended per-season player metrics, stored as JSON on the player row. */
export function buildAdvancedStats(p: Record<string, unknown>) {
  return {
    secondYellowCards: num(p.second_yellow_cards),
    xg: num(p.xg),
    xgPer90: num(p.xg_per_90),
    shots: num(p.shot),
    shotsOnTarget: num(p.shots_on_goal),
    shotsBlocked: num(p.shots_blocked_opponent),
    goalsOutOfBox: num(p.goal_out_box),
    penaltyGoals: num(p.penalty_success),
    ownGoals: num(p.owngoal),
    dribbles: num(p.dribble),
    dribblesSuccess: num(p.dribble_success),
    dribblesPer90: num(p.dribble_per_90),
    corners: num(p.corner),
    offsides: num(p.offside),
    passes: num(p.passes),
    passesAccurate: num(p.pass_acc),
    passAccuracy: num(p.pass_ratio),
    keyPasses: num(p.key_pass),
    passesForward: num(p.pass_forward),
    passesProgressive: num(p.pass_progressive),
    crosses: num(p.pass_cross),
    crossesAccurate: num(p.pass_cross_acc),
    passesToBox: num(p.pass_to_box),
    passesToFinalThird: num(p.pass_to_3rd),
    tackles: num(p.tackle),
    tacklesPer90: num(p.tackle_per_90),
    interceptions: num(p.interception),
    recoveries: num(p.recovery),
    duels: num(p.duel),
    duelsWon: num(p.duel_success),
    aerialDuels: num(p.aerial_duel),
    aerialDuelsWon: num(p.aerial_duel_success),
    groundDuels: num(p.ground_duel),
    groundDuelsWon: num(p.ground_duel_success),
    fouls: num(p.foul),
    foulsSuffered: num(p.foul_taken),
    saves: num(p.save_shot),
    saveRatio: num(p.save_shot_ratio),
    penaltySaves: num(p.save_shot_penalty),
    cleanSheets: num(p.dry_match),
    goalsConceded: num(p.goals_conceded),
    goalsConcededPenalty: num(p.goals_conceded_penalty),
    exits: num(p.exit),
    exitsSuccess: num(p.exit_success),
  };
}

export type AdvancedStats = ReturnType<typeof buildAdvancedStats>;
