import { describe, expect, it } from "vitest";
import { computeRating, playerOfTheMatch, type RatingInput } from "../src/lib/rating";

const base: RatingInput = {
  position: "MF",
  minutes: 90,
  goals: 0,
  assists: 0,
  shots: 1,
  shotsOnTarget: 0,
  xg: 0.05,
  keyPasses: 1,
  dribblesWon: 1,
  tackles: 1,
  interceptions: 1,
  recoveries: 5,
  duels: 10,
  duelsWon: 5,
  passes: 40,
  passesAccurate: 32,
  saves: 0,
  teamConceded: 1,
  goalsConceded: 0,
  yellowCards: 0,
  redCards: 0,
  ownGoals: 0,
  penaltiesMissed: 0,
  result: "D",
};

describe("computeRating", () => {
  it("rates an ordinary full match around 6.5", () => {
    const r = computeRating(base)!;
    expect(r).toBeGreaterThanOrEqual(6.2);
    expect(r).toBeLessThanOrEqual(7.0);
  });

  it("rewards a hat-trick in a win near the top of the scale", () => {
    const r = computeRating({ ...base, position: "FW", goals: 3, shots: 6, shotsOnTarget: 4, xg: 2.1, result: "W" })!;
    expect(r).toBeGreaterThanOrEqual(9.5);
    expect(r).toBeLessThanOrEqual(10);
  });

  it("rewards a goalkeeper's clean sheet with saves", () => {
    const r = computeRating({ ...base, position: "GK", saves: 6, teamConceded: 0, goalsConceded: 0, passes: 25, passesAccurate: 18, result: "W" })!;
    expect(r).toBeGreaterThanOrEqual(8);
  });

  it("punishes a red card and an own goal", () => {
    const r = computeRating({ ...base, position: "DF", redCards: 1, ownGoals: 1, teamConceded: 3, result: "L" })!;
    expect(r).toBeLessThan(4.5);
  });

  it("does not rate cameos and stays within 3–10", () => {
    expect(computeRating({ ...base, minutes: 6 })).toBeNull();
    expect(computeRating({ ...base, redCards: 2, ownGoals: 3, yellowCards: 2 })).toBe(3);
    expect(computeRating({ ...base, goals: 6, assists: 4 })).toBe(10);
  });

  it("returns one decimal place", () => {
    const r = computeRating(base)!;
    expect(Math.round(r * 10) / 10).toBe(r);
  });
});

describe("playerOfTheMatch", () => {
  it("picks the best rating, breaking ties by minutes", () => {
    const players = [
      { id: "a", rating: 7.4, minutes: 60 },
      { id: "b", rating: 7.4, minutes: 90 },
      { id: "c", rating: null, minutes: 5 },
    ];
    expect(playerOfTheMatch(players)?.id).toBe("b");
    expect(playerOfTheMatch([{ id: "x", rating: null, minutes: 3 }])).toBeNull();
  });
});
