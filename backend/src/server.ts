import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { createLogger } from "./lib/logger";
import { startScheduler, stopScheduler } from "./sync/scheduler";
import { whenIdle } from "./sync/jobs";
import { initPush, noticesFlushed } from "./modules/push/push.service";

const log = createLogger("server");

async function main() {
  await prisma.$connect();
  await initPush();
  const server = createApp().listen(env.PORT, () => log.info(`API listening on http://localhost:${env.PORT}/api`));
  await startScheduler();

  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info(`${signal} received, shutting down`);
    stopScheduler();
    // Hard deadline in case a job or an upstream request hangs.
    setTimeout(() => process.exit(1), 25_000).unref();
    const httpClosed = new Promise<void>((resolve) => server.close(() => resolve()));
    // Let the running sync job finish (it releases its DB lock) and queued pushes go out.
    Promise.allSettled([httpClosed, whenIdle().then(noticesFlushed)])
      .then(() => prisma.$disconnect())
      .finally(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error("failed to start", err);
  process.exit(1);
});
