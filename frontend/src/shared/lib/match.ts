import type { MatchSummary } from "@/shared/api/types";

/** In play right now (half-time included). */
export const isLive = (m: Pick<MatchSummary, "status">) => m.status === "LIVE" || m.status === "HALFTIME";
