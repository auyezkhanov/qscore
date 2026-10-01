import { describe, expect, it } from "vitest";
import { pickCurrentRound } from "../src/modules/leagues/leagues.service";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const round = (n: number, dates: string[], status = "SCHEDULED") => ({
  round: n,
  matches: dates.map((d) => ({ kickoff: `${d}T12:00:00Z`, status })),
});

describe("pickCurrentRound", () => {
  it("prefers a round with a live match", () => {
    const rounds = [round(1, ["2026-09-01"], "FINISHED"), { round: 2, matches: [{ kickoff: "2026-10-01T11:00:00Z", status: "LIVE" }] }];
    expect(pickCurrentRound(rounds, NOW)).toBe(2);
  });

  it("picks the chronologically next round even when rounds are out of order", () => {
    const rounds = [
      round(22, ["2026-09-12", "2026-09-13"], "FINISHED"),
      round(23, ["2026-10-17", "2026-10-18"]),
      round(28, ["2026-10-10", "2026-10-11"]),
    ];
    expect(pickCurrentRound(rounds, NOW)).toBe(28);
  });

  it("ignores a single rescheduled fixture when dating a round", () => {
    const rounds = [
      round(14, ["2026-06-20", "2026-06-20", "2026-06-21", "2026-10-14"]),
      round(28, ["2026-10-10", "2026-10-11", "2026-10-11"]),
    ];
    expect(pickCurrentRound(rounds, NOW)).toBe(28);
  });

  it("falls back to the latest round after the season", () => {
    expect(pickCurrentRound([round(1, ["2026-05-01"], "FINISHED"), round(2, ["2026-06-01"], "FINISHED")], NOW)).toBe(2);
    expect(pickCurrentRound([], NOW)).toBeNull();
  });
});
