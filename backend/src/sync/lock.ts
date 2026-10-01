import crypto from "crypto";
import { prisma } from "../lib/prisma";

const LEASE_MS = 3 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;

/** Identifies this process as the lock owner. */
const OWNER = `${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

/**
 * Database lease shared by every backend process and the CLI. A lease expires
 * on its own if its holder dies, so a crash can never wedge syncing; a live
 * holder keeps extending it with a heartbeat.
 */
export async function tryAcquire(name: string): Promise<(() => Promise<void>) | null> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_MS);

  // Take over an expired (or our own) lease atomically…
  const taken = await prisma.syncLock.updateMany({
    where: { name, OR: [{ expiresAt: { lt: now } }, { owner: OWNER }] },
    data: { owner: OWNER, expiresAt },
  });
  if (taken.count === 0) {
    // …or create it if it has never existed. A concurrent creator wins the race.
    try {
      await prisma.syncLock.create({ data: { name, owner: OWNER, expiresAt } });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return null;
      throw err;
    }
  }

  const heartbeat = setInterval(() => {
    void prisma.syncLock
      .updateMany({ where: { name, owner: OWNER }, data: { expiresAt: new Date(Date.now() + LEASE_MS) } })
      .catch(() => undefined);
  }, HEARTBEAT_MS);
  heartbeat.unref();

  return async () => {
    clearInterval(heartbeat);
    await prisma.syncLock.updateMany({ where: { name, owner: OWNER }, data: { expiresAt: new Date(0) } }).catch(() => undefined);
  };
}
