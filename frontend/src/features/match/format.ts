import type { MatchEvent } from "@/shared/api/types";

/** "45+2′" / "67′". */
export function minuteLabel(e: Pick<MatchEvent, "minute" | "addedTime">): string {
  return e.addedTime ? `${e.minute}+${e.addedTime}′` : `${e.minute}′`;
}

/** Last word of a full name, for tight spots (pitch labels, scorer lines). */
export function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

export const GOAL_TYPES: ReadonlySet<MatchEvent["type"]> = new Set(["GOAL", "PENALTY_GOAL", "OWN_GOAL"]);

/** Events in match order (the API usually sorts them, but don't rely on it). */
export function sortEvents(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => a.minute - b.minute || (a.addedTime ?? 0) - (b.addedTime ?? 0));
}
