import type { Position } from "@prisma/client";

/** What the rating needs to know about one player's match. */
export type RatingInput = {
  position: Position;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  keyPasses: number;
  dribblesWon: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  duels: number;
  duelsWon: number;
  passes: number;
  passesAccurate: number;
  saves: number;
  /** Goals the player's team conceded in the match. */
  teamConceded: number;
  /** Goals conceded while this goalkeeper was on the pitch (source figure); ignored for outfielders. */
  goalsConceded: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltiesMissed: number;
  result: "W" | "D" | "L";
};

/** Below this many minutes a rating says more about noise than performance. */
export const MIN_RATED_MINUTES = 10;

const GOAL_VALUE: Record<Position, number> = { GK: 1.5, DF: 1.3, MF: 1.1, FW: 1.0 };
const CLEAN_SHEET: Record<Position, number> = { GK: 0.6, DF: 0.4, MF: 0.1, FW: 0 };

/**
 * Qscore match rating on FotMob's familiar 3–10 scale, built only from the
 * per-match numbers kffleague.kz publishes. Everyone starts at 6.0; decisive
 * actions (goals, assists, saves, chances created) move it most, ball-winning
 * and passing quality fine-tune it, and cards/own goals pull it down.
 * Returns null for cameo appearances.
 */
export function computeRating(p: RatingInput): number | null {
  if (p.minutes < MIN_RATED_MINUTES) return null;
  const share = Math.min(1, p.minutes / 90);
  let r = 6.0;

  // Attack
  r += p.goals * GOAL_VALUE[p.position];
  r += p.assists * 0.8;
  r += p.xg * 0.4;
  r += p.shotsOnTarget * 0.15;
  r -= Math.max(0, p.shots - p.shotsOnTarget) * 0.03;
  r += p.keyPasses * 0.2;
  r += p.dribblesWon * 0.1;

  // Defence & duels
  r += p.tackles * 0.1 + p.interceptions * 0.1 + p.recoveries * 0.03;
  r += p.duelsWon * 0.04 - Math.max(0, p.duels - p.duelsWon) * 0.03;

  // Passing: quality once there is a meaningful sample, plus a little for volume.
  if (p.passes >= 10) r += (p.passesAccurate / p.passes - 0.75) * 1.5;
  r += Math.min(p.passes, 120) * 0.003;

  // Goalkeeping & clean sheets
  if (p.position === "GK") {
    r += p.saves * 0.25;
    r -= p.goalsConceded * 0.3;
  }
  if (p.teamConceded === 0 && p.minutes >= 60) r += CLEAN_SHEET[p.position];
  if ((p.position === "GK" || p.position === "DF") && p.teamConceded >= 3) r -= 0.3;

  // Discipline & errors
  r -= p.yellowCards * 0.3 + p.redCards * 1.5 + p.ownGoals * 1.0 + p.penaltiesMissed * 0.8;

  // The result matters, weighted by time on the pitch.
  r += (p.result === "W" ? 0.25 : p.result === "L" ? -0.2 : 0) * share;

  return Math.round(Math.min(10, Math.max(3, r)) * 10) / 10;
}

/** Highest-rated player of a match (ties broken by minutes played). */
export function playerOfTheMatch<T extends { rating: number | null; minutes: number }>(players: T[]): T | null {
  let best: T | null = null;
  for (const p of players) {
    if (p.rating == null) continue;
    if (!best || p.rating > best.rating! || (p.rating === best.rating && p.minutes > best.minutes)) best = p;
  }
  return best;
}
