import { env } from "../config/env";
import { createLogger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { fullSync, isDatabaseEmpty, liveSync, runExclusive, type JobName, type JobOutcome } from "./jobs";
import { transfermarktSync } from "./transfermarkt";

const log = createLogger("scheduler");

const timers: NodeJS.Timeout[] = [];
const HOUR_MS = 60 * 60 * 1000;
const RETRY_MS = 20 * 1000;
// Long enough to outlast a killed instance's lock lease (3 min) and a full pass of the old one.
const MAX_ATTEMPTS = 20;

let stopped = false;
const pending = new Set<JobName>();

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    timers.push(t);
  });

/**
 * Runs a job, retrying shortly while it is merely skipped because another job holds
 * the lock. Without this, timers that line up (the minutely live sync fires at the same
 * instant as every whole-minute schedule) or a rolling deploy would starve the job
 * until its next scheduled tick. Failures are not retried here.
 */
async function runWhenFree(job: JobName, fn: () => Promise<void>): Promise<JobOutcome> {
  if (pending.has(job)) return "skipped"; // a retry loop for this job is already waiting
  pending.add(job);
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !stopped; attempt++) {
      const outcome = await runExclusive(job, fn);
      if (outcome !== "skipped") return outcome;
      await wait(RETRY_MS);
    }
    if (!stopped) log.warn(`${job} sync could not get the sync lock after ${MAX_ATTEMPTS} attempts`);
    return "skipped";
  } finally {
    pending.delete(job);
  }
}

/** Runs the Transfermarkt enrichment when its last success is older than the configured interval. */
async function runTransfermarktIfDue() {
  const last = await prisma.syncRun.findUnique({ where: { job: "transfermarkt" } });
  const age = last?.lastSuccessAt ? Date.now() - last.lastSuccessAt.getTime() : Infinity;
  // After a failure (e.g. throttled) wait a few hours instead of retrying every tick.
  const failedRecently = !!last?.lastError && !!last.lastStartedAt && Date.now() - last.lastStartedAt.getTime() < 3 * HOUR_MS;
  if (age >= env.TM_SYNC_INTERVAL_HOURS * HOUR_MS && !failedRecently) await runWhenFree("transfermarkt", transfermarktSync);
}

export async function startScheduler() {
  if (!env.SYNC_ENABLED) {
    log.info("background sync disabled (SYNC_ENABLED=false)");
    return;
  }
  stopped = false;

  const runFull = () => void runWhenFree("full", fullSync);
  // Live ticks every minute anyway, so a skipped one simply waits for the next.
  const runLive = () => void runExclusive("live", liveSync);

  if (await isDatabaseEmpty()) {
    log.info("database is empty — bootstrapping from kffleague.kz (takes a few minutes)");
  }
  // Always start with a full pass: it fills an empty database and catches up
  // on anything that changed while the server was down.
  runFull();

  timers.push(setInterval(runLive, env.LIVE_SYNC_INTERVAL_SEC * 1000));
  timers.push(setInterval(runFull, env.FULL_SYNC_INTERVAL_MIN * 60 * 1000));

  if (env.TM_SYNC_ENABLED) {
    const checkTm = () => void runTransfermarktIfDue().catch((err) => log.warn("transfermarkt check failed", err));
    // Give the initial full sync a head start, then check hourly.
    timers.push(setTimeout(checkTm, 5 * 60 * 1000));
    timers.push(setInterval(checkTm, HOUR_MS));
  }
}

export function stopScheduler() {
  stopped = true;
  for (const t of timers.splice(0)) clearInterval(t);
}
