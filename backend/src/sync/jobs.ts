import { prisma } from "../lib/prisma";
import { createLogger } from "../lib/logger";
import { kff, sleep } from "../integrations/kff/client";
import { mapGameStatus } from "../integrations/kff/mappers";
import { detectNotice, enqueueNotice } from "../modules/push/push.service";
import { LEAGUES, RECENT_MATCH_RESYNC_MS, REQUEST_GAP_MS } from "./config";
import { tryAcquire } from "./lock";
import { upsertLeagueSeason } from "./seasons";
import { ensureGameTeams, loadTeamIdMap, syncHomeGrounds, syncTable, type TeamIdMap } from "./teams";
import { loadPlayerIdMap, refreshPlayerCounters, syncRosters, type PlayerIdMap } from "./players";
import { DETAILS_VERSION, hasDetailData, syncMatchDetail, syncMatchPreview, upsertGames, type UpsertedGame } from "./matches";
import { syncTransfers } from "./transfers";

const log = createLogger("sync");

export type JobName = "full" | "live" | "transfermarkt";

/** The job running in this process (cross-process exclusion is the DB lease). */
let running: JobName | null = null;
let runningPromise: Promise<unknown> | null = null;

export function currentJob() {
  return running;
}

/** Resolves when the in-flight job (if any) finishes — used for graceful shutdown. */
export function whenIdle(): Promise<unknown> {
  return runningPromise ?? Promise.resolve();
}

/** "skipped": another job held the lock, so this one never started (worth retrying soon). */
export type JobOutcome = "done" | "failed" | "skipped";

/**
 * Runs a job unless another one is in progress here or in any other process
 * (database lease), and records the outcome in SyncRun.
 */
export async function runExclusive(job: JobName, fn: () => Promise<void>): Promise<JobOutcome> {
  if (running) {
    log.debug(`${job} sync skipped: ${running} sync still running`);
    return "skipped";
  }
  running = job;
  const run = (async (): Promise<JobOutcome> => {
    let release: (() => Promise<void>) | null = null;
    const startedAt = new Date();
    try {
      release = await tryAcquire("sync");
      if (!release) {
        log.debug(`${job} sync skipped: another process holds the sync lock`);
        return "skipped";
      }
      await prisma.syncRun.upsert({ where: { job }, create: { job, lastStartedAt: startedAt }, update: { lastStartedAt: startedAt } });
      await fn();
      await prisma.syncRun.update({ where: { job }, data: { lastSuccessAt: new Date(), lastError: null } });
      log.info(`${job} sync finished in ${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)}s`);
      return "done";
    } catch (err) {
      log.error(`${job} sync failed`, err);
      await prisma.syncRun
        .upsert({
          where: { job },
          create: { job, lastStartedAt: startedAt, lastError: err instanceof Error ? err.message : String(err) },
          update: { lastError: err instanceof Error ? err.message : String(err) },
        })
        .catch(() => undefined);
      return "failed";
    } finally {
      await release?.();
    }
  })();
  runningPromise = run;
  try {
    return await run;
  } finally {
    running = null;
    runningPromise = null;
  }
}

/** Queues push notifications for every fixture whose state changed (sending happens outside the sync). */
function dispatchNotices(upserted: UpsertedGame[]) {
  for (const u of upserted) {
    const current = { status: mapGameStatus(u.game).status, homeScore: u.game.home_score, awayScore: u.game.away_score };
    const notice = detectNotice(u.previous, current);
    if (notice) enqueueNotice(u.matchId, notice);
  }
}

/** Called regularly during long jobs so live scores keep flowing on match days. */
type Tick = () => Promise<void>;

async function syncDetails(games: UpsertedGame[], teamIds: TeamIdMap, playerIds: PlayerIdMap, tick?: Tick) {
  let done = 0;
  for (const { game, matchId } of games) {
    try {
      await syncMatchDetail(game.id, matchId, teamIds, playerIds);
      done++;
    } catch (err) {
      log.warn(`match ${game.id}: detail sync failed`, err);
    }
    if (done > 0 && done % 25 === 0) log.info(`  match details: ${done}/${games.length}`);
    await tick?.();
    await sleep(REQUEST_GAP_MS);
  }
  return done;
}

const PREVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function syncPreviews(games: UpsertedGame[], teamIds: TeamIdMap, playerIds: PlayerIdMap) {
  for (const { game, matchId } of games) {
    try {
      await syncMatchPreview(game.id, matchId, teamIds, playerIds);
    } catch (err) {
      log.warn(`match ${game.id}: preview sync failed`, err);
    }
    await sleep(REQUEST_GAP_MS);
  }
}

/**
 * Full, non-destructive refresh of both leagues: table, teams, rosters,
 * fixtures, transfers, and details of finished matches that are missing or recent.
 */
export async function fullSync() {
  const frontMap = await kff.frontMap();
  const teamIds = await loadTeamIdMap();
  const playerIds = await loadPlayerIdMap();

  // A full pass can take minutes; keep live matches fresh meanwhile.
  let lastLive = Date.now();
  const tick: Tick = async () => {
    if (Date.now() - lastLive < 60_000) return;
    lastLive = Date.now();
    const live = await prisma.match.count({ where: { status: { in: ["LIVE", "HALFTIME"] } } });
    const soon = await prisma.match.count({
      where: { status: "SCHEDULED", timeTbd: false, kickoff: { gte: new Date(Date.now() - 15 * 60_000), lte: new Date(Date.now() + 15 * 60_000) } },
    });
    if (live + soon > 0) await liveRefresh(teamIds, playerIds).catch((err) => log.warn("live refresh during full sync failed", err));
  };

  for (const cfg of LEAGUES) {
    const entry = frontMap.items[cfg.code];
    if (!entry) {
      log.warn(`no front-map entry for "${cfg.code}", skipping ${cfg.slug}`);
      continue;
    }
    log.info(`[${cfg.slug}] season ${entry.season_id}: table`);
    const { season } = await upsertLeagueSeason(cfg, entry);

    const [tableRu, tableEn] = await Promise.all([kff.table(entry.season_id, "ru"), kff.table(entry.season_id, "en").catch(() => ({ table: [] }))]);
    await syncTable(season.id, tableRu.table, tableEn.table, teamIds);
    const teamExtIds = tableRu.table.map((r) => r.team_id);

    log.info(`[${cfg.slug}] fixtures`);
    const games = await kff.games(entry.season_id);
    await ensureGameTeams(games, teamIds);
    const upserted = await upsertGames(season.id, games, teamIds);
    dispatchNotices(upserted);
    await syncHomeGrounds(games, teamIds);

    log.info(`[${cfg.slug}] rosters for ${teamExtIds.length} clubs`);
    await syncRosters(season.id, entry.season_id, teamExtIds, teamIds, playerIds);
    await tick();

    log.info(`[${cfg.slug}] transfers`);
    await syncTransfers(season.id, entry.season_id, teamExtIds, teamIds, playerIds);

    // Up to date = synced at the current details version (older ones are backfilled).
    const upToDate = new Set(
      (
        await prisma.match.findMany({
          where: { seasonId: season.id, detailsSyncedAt: { not: null }, detailsVersion: { gte: DETAILS_VERSION } },
          select: { id: true },
        })
      ).map((m) => m.id),
    );
    const recentCutoff = Date.now() - RECENT_MATCH_RESYNC_MS;
    const needDetails = upserted.filter(
      ({ game, matchId }) => hasDetailData(game) && (!upToDate.has(matchId) || game.is_live || new Date(game.date).getTime() >= recentCutoff),
    );
    log.info(`[${cfg.slug}] details for ${needDetails.length} of ${upserted.length} matches`);
    await syncDetails(needDetails, teamIds, playerIds, tick);

    // Coaches, suspensions and early lineups for the coming week.
    const weekAhead = Date.now() + PREVIEW_WINDOW_MS;
    const previews = upserted.filter(({ game }) => {
      const t = new Date(game.date).getTime();
      return game.status === "upcoming" && !game.is_live && t <= weekAhead && t >= Date.now() - 24 * 60 * 60 * 1000;
    });
    log.info(`[${cfg.slug}] previews for ${previews.length} upcoming matches`);
    await syncPreviews(previews, teamIds, playerIds);
  }

  // Club assignments are final only after every league is synced.
  await refreshPlayerCounters();
}

/**
 * Cheap refresh for match days: fixture list (scores/status/minute/broadcast
 * links), full detail for live matches and ones that just ended, and the table
 * whenever a result changed. Never deletes anything outside a match's own details.
 */
export async function liveSync() {
  const teamIds = await loadTeamIdMap();
  const playerIds = await loadPlayerIdMap();
  await liveRefresh(teamIds, playerIds);
}

async function liveRefresh(teamIds: TeamIdMap, playerIds: PlayerIdMap) {
  const seasons = await prisma.season.findMany({ where: { isCurrent: true } });
  for (const season of seasons) {
    const games = await kff.games(season.externalId);
    const unknownTeams = games.some((g) => !teamIds.has(g.home_team.id) || !teamIds.has(g.away_team.id));
    if (unknownTeams) await ensureGameTeams(games, teamIds);
    const upserted = await upsertGames(season.id, games, teamIds);
    dispatchNotices(upserted);

    const needDetails = upserted.filter(({ game, statusChanged }) => game.is_live || (statusChanged && hasDetailData(game)));
    if (needDetails.length > 0) await syncDetails(needDetails, teamIds, playerIds);

    // Lineups are announced about an hour before kick-off: poll matches starting soon.
    const soon = await prisma.match.findMany({
      where: {
        seasonId: season.id,
        status: "SCHEDULED",
        timeTbd: false,
        kickoff: { gte: new Date(Date.now() - 30 * 60 * 1000), lte: new Date(Date.now() + 3 * 60 * 60 * 1000) },
        OR: [{ previewSyncedAt: null }, { previewSyncedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } }],
      },
      select: { id: true },
    });
    const soonIds = new Set(soon.map((m) => m.id));
    const previews = upserted.filter((u) => soonIds.has(u.matchId));
    if (previews.length > 0) await syncPreviews(previews, teamIds, playerIds);

    const resultChanged = upserted.some(({ game, statusChanged }) => statusChanged && game.status === "finished");
    if (resultChanged) {
      const [tableRu, tableEn] = await Promise.all([kff.table(season.externalId, "ru"), kff.table(season.externalId, "en").catch(() => ({ table: [] }))]);
      await syncTable(season.id, tableRu.table, tableEn.table, teamIds);
    }
    await sleep(REQUEST_GAP_MS);
  }
}

export async function isDatabaseEmpty() {
  return (await prisma.season.count({ where: { isCurrent: true } })) === 0;
}
