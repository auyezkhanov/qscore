import { prisma } from "../../lib/prisma";
import type { Lang } from "../../lib/i18n";
import type { BroadcasterDto } from "../../integrations/kff/matchMappers";
import { matchSummaryInclude, toMatchSummary } from "../shared/dto";

/** Upcoming and live matches with their TV/stream channels, soonest first. */
export async function getTvSchedule(days: number, lang: Lang) {
  const now = Date.now();
  const matches = await prisma.match.findMany({
    where: {
      kickoff: { gte: new Date(now - 3 * 60 * 60 * 1000), lte: new Date(now + days * 24 * 60 * 60 * 1000) },
      status: { in: ["SCHEDULED", "LIVE", "HALFTIME"] },
    },
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    include: matchSummaryInclude,
  });
  return matches.map((m) => ({
    ...toMatchSummary(m, lang),
    youtubeUrl: m.youtubeUrl,
    broadcasters: Array.isArray(m.broadcasters) ? (m.broadcasters as unknown as BroadcasterDto[]) : [],
  }));
}
