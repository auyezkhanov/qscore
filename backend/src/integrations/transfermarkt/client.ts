import { sleep, USER_AGENT } from "../kff/client";
import { createLimiter } from "../../lib/limiter";

const BASE = "https://www.transfermarkt.com";
const TIMEOUT_MS = 30_000;
/** Pause between page loads — this is a third-party site, keep the footprint small. */
export const TM_REQUEST_GAP_MS = 2_500;

export class TmError extends Error {
  constructor(
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
  }
}

// One request at a time with a polite gap, for the sync and on-demand lookups alike.
const limit = createLimiter(1, TM_REQUEST_GAP_MS);

function getHtml(path: string, accept = "text/html"): Promise<string> {
  return limit(() => fetchHtml(path, accept));
}

async function fetchHtml(path: string, accept: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(5_000);
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: accept, "Accept-Language": "en" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // 403/429 mean we're being throttled: retrying immediately only makes it worse.
      if (res.status === 403 || res.status === 429) throw new TmError(res.status, `transfermarkt ${path} -> HTTP ${res.status}`);
      if (!res.ok) throw new TmError(res.status, `transfermarkt ${path} -> HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (err instanceof TmError && (err.status === 403 || err.status === 429 || err.status === 404)) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new TmError(null, String(lastError));
}

export const tm = {
  leagueTransfers: (competition: string, seasonId: number) =>
    getHtml(`/x/transfers/wettbewerb/${competition}/saison_id/${seasonId}`),
  squad: (clubId: number, seasonId: number) => getHtml(`/x/kader/verein/${clubId}/saison_id/${seasonId}/plus/1`),
  valueHistory: async (playerId: number): Promise<unknown> =>
    JSON.parse(await getHtml(`/ceapi/marketValueDevelopment/graph/${playerId}`, "application/json")),
};
