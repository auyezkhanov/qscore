import { safeUrl } from "../../lib/url";
import type { Broadcaster, GameLineupExtras, LineupPerson, PlayerMatchStatRaw, Suspension } from "./types";
import { fullName } from "./mappers";

const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Our stored per-match player numbers (without ids/rating). */
export type PlayerMatchNumbers = {
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
  yellowCards: number;
  redCards: number;
  ownGoals: number;
};

export function mapPlayerMatchStat(raw: PlayerMatchStatRaw): PlayerMatchNumbers {
  const e = raw.extra_stats ?? {};
  return {
    minutes: n(raw.minutes_played) || n(e.time_on_field_total),
    goals: n(raw.goals) || n(e.goal),
    assists: n(raw.assists) || n(e.goal_pass),
    shots: n(e.shot),
    shotsOnTarget: n(e.shots_on_goal),
    xg: Math.round(n(e.xg) * 100) / 100,
    passes: n(e.pass),
    passesAccurate: n(e.pass_acc),
    keyPasses: n(e.key_pass),
    crosses: n(e.pass_cross),
    dribbles: n(e.dribble),
    dribblesWon: n(e.dribble_success),
    tackles: n(e.tackle),
    interceptions: n(e.interception),
    recoveries: n(e.recovery),
    duels: n(e.duel),
    duelsWon: n(e.duel_success),
    fouls: n(e.foul),
    foulsSuffered: n(e.foul_taken),
    offsides: n(e.offside),
    saves: n(e.save_shot) || n(e.saves),
    goalsConceded: n(e.goals_conceded),
    yellowCards: n(raw.yellow_cards) || n(e.yellow_cards),
    redCards: Math.max(n(raw.red_cards) || n(e.red_cards), n(e.second_yellow_cards) > 0 ? 1 : 0),
    ownGoals: n(e.owngoal),
  };
}

export type Official = { role: string; name: string; nameEn: string | null };

// Referee roles in display order; anything else (inspectors etc.) is dropped.
const OFFICIAL_ROLES = ["main", "first_assistant", "second_assistant", "fourth_referee", "var_main", "var_assistant"];

export function mapOfficials(ru: LineupPerson[] | null | undefined, en: LineupPerson[] | null | undefined): Official[] {
  const enById = new Map((en ?? []).filter((p) => p.id != null).map((p) => [p.id, fullName(p.first_name, p.last_name)]));
  return (ru ?? [])
    .filter((p) => p.role && OFFICIAL_ROLES.includes(p.role))
    .sort((a, b) => OFFICIAL_ROLES.indexOf(a.role!) - OFFICIAL_ROLES.indexOf(b.role!))
    .map((p) => ({ role: p.role!, name: fullName(p.first_name, p.last_name), nameEn: (p.id != null && enById.get(p.id)) || null }));
}

/** The head coach of one side ("Главный тренер"); null when the source lists only assistants. */
export function headCoach(ru: LineupPerson[] | undefined, en: LineupPerson[] | undefined): { name: string; nameEn: string | null } | null {
  const isHead = (p: LineupPerson) => /главн|head/i.test(p.role ?? "");
  const head = (ru ?? []).find(isHead);
  if (!head) return null;
  const enHead = (en ?? []).find((p) => (head.id != null && p.id === head.id) || isHead(p));
  return { name: fullName(head.first_name, head.last_name), nameEn: enHead ? fullName(enHead.first_name, enHead.last_name) : null };
}

export type Absence = {
  side: "home" | "away";
  playerExternalId: number | null;
  name: string;
  nameEn: string | null;
  number: number | null;
  reason: string | null;
  matchesSuspended: number | null;
};

export function mapAbsences(ru: GameLineupExtras["suspensions"], en: GameLineupExtras["suspensions"]): Absence[] {
  const out: Absence[] = [];
  for (const side of ["home", "away"] as const) {
    const key = side === "home" ? "home_team" : "away_team";
    const enById = new Map((en?.[key] ?? []).map((s) => [s.player_id, s]));
    for (const s of ru?.[key] ?? []) {
      const e: Suspension | undefined = s.player_id != null ? enById.get(s.player_id) : undefined;
      const name = fullName(s.first_name, s.last_name);
      if (!name) continue;
      out.push({
        side,
        playerExternalId: s.player_id,
        name,
        nameEn: e ? fullName(e.first_name, e.last_name) || null : null,
        number: s.shirt_number,
        reason: s.reason_label,
        matchesSuspended: s.matches_suspended,
      });
    }
  }
  return out;
}

export type BroadcasterDto = { name: string; logoUrl: string | null; type: string | null; url: string | null };

export function mapBroadcasters(list: Broadcaster[] | null | undefined): BroadcasterDto[] {
  return (list ?? [])
    .filter((b) => b.name)
    .map((b) => ({ name: b.name, logoUrl: safeUrl(b.logo_url), type: b.type, url: safeUrl(b.website) }));
}
