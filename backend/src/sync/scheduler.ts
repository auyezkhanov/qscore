import { env } from "../config/env";
import { createLogger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { fullSync, isDatabaseEmpty, liveSync, runExclusive } from "./jobs";
import { transfermarktSync } from "./transfermarkt";

const log = createLogger("scheduler");

const timers: NodeJS.Timeout[] = [];
const HOUR_MS = 60 * 60 * 1000;

/** Runs the Transfermarkt enrichment when its last success is older than the configured interval. */
async function runTransfermarktIfDue() {
  const last = await prisma.syncRun.findUnique({ where: { job: "transfermarkt" } });
  const age = last?.lastSuccessAt ? Date.now() - last.lastSuccessAt.getTime() : Infinity;
  // After a failure (e.g. throttled) wait a few hours instead of retrying every tick.
  const failedRecently = !!last?.lastError && !!last.lastStartedAt && Date.now() - last.lastStartedAt.getTime() < 3 * HOUR_MS;
  if (age >= env.TM_SYNC_INTERVAL_HOURS * HOUR_MS && !failedRecently) await runExclusive("transfermarkt", transfermarktSync);
}

export async function startScheduler() {
  if (!env.SYNC_ENABLED) {
    log.info("background sync disabled (SYNC_ENABLED=false)");
    return;
  }

  const runFull = () => void runExclusive("full", fullSync);
  const runLive = () => void runExclusive("live", liveSync);

  if (await isDatabaseEmpty()) {
    log.info("database is empty — bootstrapping from kffleague.kz (takes a few minutes)");
  }
  // Always start with a full pass: it fills an empty database and catches up
  // on anything that changed while the server was down. During a rolling deploy
  // the old instance may still hold the sync lock (or a killed one's lease has not
  // expired yet), so keep retrying until this instance's pass has actually started
  // instead of waiting for the next 6-hourly tick.
  const bootAt = Date.now();
  const catchUp = async () => {
    await runExclusive("full", fullSync);
    const run = await prisma.syncRun.findUnique({ where: { job: "full" }, select: { lastStartedAt: true } });
    if (!run?.lastStartedAt || run.lastStartedAt.getTime() < bootAt) {
      log.info("initial full sync deferred: sync lock is held elsewhere, retrying in 60s");
      timers.push(setTimeout(() => void catchUp().catch((err) => log.warn("initial full sync check failed", err)), 60_000));
    }
  };
  void catchUp().catch((err) => log.warn("initial full sync check failed", err));

  timers.push(setInterval(runLive, env.LIVE_SYNC_INTERVAL_SEC * 1000));
  timers.push(setInterval(runFull, env.FULL_SYNC_INTERVAL_MIN * 60 * 1000));

  if (env.TM_SYNC_ENABLED) {
    const checkTm = () => void runTransfermarktIfDue().catch((err) => log.warn("transfermarkt check failed", err));
    // Give the initial full sync a head start, then check every minute. The check is
    // one cheap query and a no-op until the job is due; checking often means a tick
    // skipped because another job held the lock is retried a minute later, not an hour.
    timers.push(
      setTimeout(() => {
        checkTm();
        timers.push(setInterval(checkTm, 60 * 1000));
      }, 5 * 60 * 1000),
    );
  }
}

export function stopScheduler() {
  for (const t of timers.splice(0)) clearInterval(t);
}
