import { prisma } from "../lib/prisma";
import { fullSync, liveSync, runExclusive, type JobName } from "./jobs";
import { transfermarktSync } from "./transfermarkt";

const JOBS: Record<JobName, () => Promise<void>> = { full: fullSync, live: liveSync, transfermarkt: transfermarktSync };

async function main() {
  const arg = process.argv[2] ?? "full";
  if (!(arg in JOBS)) throw new Error(`unknown job "${arg}", expected one of: ${Object.keys(JOBS).join(", ")}`);
  const job = arg as JobName;
  const ok = await runExclusive(job, JOBS[job]);
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
