import type { LineupPlayer } from "@/shared/api/types";

/** Players whose y differs by at most this much (in the 0..100 frame) share a line. */
const LINE_TOLERANCE = 8;

/**
 * Depth of the goalkeeper and of the first/last outfield lines, in % of the full pitch length
 * from the own goal. Landscape nodes are wider than they are tall, so the keeper sits further
 * from the edge and the front lines stay clear of the halfway line.
 */
const DEPTHS = {
  portrait: { gk: 5.5, first: 15.5, last: 45 },
  landscape: { gk: 6.5, first: 17, last: 44.5 },
} as const;

export type PitchSlot = {
  lp: LineupPlayer;
  side: "home" | "away";
  /** Positions in % of the pitch box for the landscape (≥ sm) and portrait (mobile) layouts. */
  landscape: { left: number; top: number };
  portrait: { left: number; top: number };
};

/**
 * Turns an XI's raw grid coordinates into non-overlapping pitch positions.
 *
 * Coordinates arrive in the team's own frame (y = depth from its own goal,
 * x = left→right as the team faces the opponent's goal). Players are grouped
 * into lines by y and spaced evenly across the width within a line; lines are
 * then spaced evenly through the team's own half, leaving a gap at halfway.
 *
 * Landscape: home defends the left goal, away the right one.
 * Portrait:  home defends the bottom goal, away the top one.
 */
export function buildPitchSlots(players: LineupPlayer[], side: "home" | "away"): PitchSlot[] {
  const placed = players.filter((p): p is LineupPlayer & { gridX: number; gridY: number } => p.gridX != null && p.gridY != null);
  if (placed.length === 0) return [];

  const sorted = [...placed].sort((a, b) => a.gridY - b.gridY);
  const lines: (typeof sorted)[] = [];
  for (const p of sorted) {
    const line = lines[lines.length - 1];
    if (line && p.gridY - line[0].gridY <= LINE_TOLERANCE) line.push(p);
    else lines.push([p]);
  }

  // A lone deepest player (the keeper) sits just in front of goal; outfield lines share the rest of the half.
  const hasKeeper = lines[0].length === 1 && lines[0][0].gridY < 15;
  const outfield = hasKeeper ? lines.length - 1 : lines.length;

  return lines.flatMap((line, li) => {
    const oi = hasKeeper ? li - 1 : li;
    const depthFor = ({ gk, first, last }: { gk: number; first: number; last: number }) =>
      hasKeeper && li === 0 ? gk : outfield <= 1 ? (first + last) / 2 : first + (oi * (last - first)) / (outfield - 1);
    // Along the length, measured from the HOME goal (0) to the away goal (100).
    const along = (depth: number) => (side === "home" ? depth : 100 - depth);
    const landscapeAlong = along(depthFor(DEPTHS.landscape));
    const portraitAlong = along(depthFor(DEPTHS.portrait));

    const byX = [...line].sort((a, b) => a.gridX - b.gridX);
    const n = byX.length;
    return byX.map((lp, i) => {
      // Across the width, in the team's own left→right frame.
      const x = n === 1 ? clamp(lp.gridX, 15, 85) : ((i + 0.5) * 100) / n;
      // Home faces up (portrait) / right (landscape); away faces the other way, so its left↔right flips.
      const cross = side === "home" ? x : 100 - x;
      return {
        lp,
        side,
        landscape: { left: landscapeAlong, top: cross },
        portrait: { left: cross, top: 100 - portraitAlong },
      };
    });
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
