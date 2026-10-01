import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { Position } from "@/shared/api/types";

export const TRANSFER_LEAGUES = ["kpl", "birinshi-liga"] as const;
export type TransferLeague = (typeof TRANSFER_LEAGUES)[number];
export const POSITIONS: readonly Position[] = ["GK", "DF", "MF", "FW"];

const DEFAULT_LEAGUE: TransferLeague = "kpl";

export type TransferSort = "recent" | "fee";
export type TransferFilters = { league: TransferLeague; team?: string; position?: Position; sort: TransferSort };

/**
 * Transfer filters kept in the URL (`?league=&team=&pos=`) so they survive
 * reloads and can be shared. Unknown values fall back to "no filter".
 */
export function useTransferFilters() {
  const [params, setParams] = useSearchParams();

  const rawLeague = params.get("league");
  const rawPos = params.get("pos");
  const filters: TransferFilters = {
    league: TRANSFER_LEAGUES.find((l) => l === rawLeague) ?? DEFAULT_LEAGUE,
    team: params.get("team") || undefined,
    position: POSITIONS.find((p) => p === rawPos),
    sort: params.get("sort") === "fee" ? "fee" : "recent",
  };

  /** Applies only the keys present in `changes`; an undefined value removes the param. */
  const update = useCallback(
    (changes: Partial<Record<"league" | "team" | "pos" | "sort", string | undefined>>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  // Teams belong to a league, so switching league drops the team filter.
  const setLeague = useCallback(
    (league: TransferLeague) => update({ league: league === DEFAULT_LEAGUE ? undefined : league, team: undefined }),
    [update],
  );
  const setTeam = useCallback((team: string | undefined) => update({ team }), [update]);
  const setPosition = useCallback((position: Position | undefined) => update({ pos: position }), [update]);
  const setSort = useCallback((sort: TransferSort) => update({ sort: sort === "fee" ? sort : undefined }), [update]);
  const reset = useCallback(() => update({ team: undefined, pos: undefined }), [update]);

  return { filters, setLeague, setTeam, setPosition, setSort, reset, isFiltered: !!filters.team || !!filters.position };
}
