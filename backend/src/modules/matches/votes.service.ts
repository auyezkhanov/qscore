import { prisma } from "../../lib/prisma";
import { HttpError, notFound } from "../../lib/http";

export type VoteChoice = "home" | "draw" | "away";

/**
 * Who is voting. A signed-in user votes as `user:<id>`; `device` is the guest id
 * of the same browser, so a vote cast before signing in isn't counted twice.
 */
export type Voter = { id: string; device: string | null };

/** Voting is open until kick-off. */
const isOpen = (m: { status: string; kickoff: Date }) => m.status === "SCHEDULED" && m.kickoff.getTime() > Date.now();

async function myVote(matchId: string, voter: Voter) {
  const ids = [voter.id, ...(voter.device && voter.device !== voter.id ? [voter.device] : [])];
  const votes = await prisma.matchVote.findMany({ where: { matchId, voterId: { in: ids } }, select: { voterId: true, choice: true } });
  // The account's own vote wins over an earlier guest vote.
  return (votes.find((v) => v.voterId === voter.id) ?? votes[0])?.choice as VoteChoice | undefined;
}

export async function getVotes(matchId: string, voter: Voter | null) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true, kickoff: true } });
  if (!match) throw notFound("Match");
  const [groups, mine] = await Promise.all([
    prisma.matchVote.groupBy({ by: ["choice"], where: { matchId }, _count: { _all: true } }),
    voter ? myVote(matchId, voter) : undefined,
  ]);
  const counts = { home: 0, draw: 0, away: 0 };
  for (const g of groups) if (g.choice in counts) counts[g.choice as VoteChoice] = g._count._all;
  return {
    counts,
    total: counts.home + counts.draw + counts.away,
    myVote: mine ?? null,
    open: isOpen(match),
  };
}

export async function castVote(matchId: string, voter: Voter, choice: VoteChoice) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true, kickoff: true } });
  if (!match) throw notFound("Match");
  if (!isOpen(match)) throw new HttpError(409, "VOTING_CLOSED", "Voting closes at kick-off");
  await prisma.$transaction([
    // Signing in takes over this browser's guest vote instead of adding a second one.
    ...(voter.device && voter.device !== voter.id ? [prisma.matchVote.deleteMany({ where: { matchId, voterId: voter.device } })] : []),
    prisma.matchVote.upsert({
      where: { matchId_voterId: { matchId, voterId: voter.id } },
      create: { matchId, voterId: voter.id, choice },
      update: { choice },
    }),
  ]);
  return getVotes(matchId, voter);
}
