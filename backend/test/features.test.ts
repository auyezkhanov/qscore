import { describe, expect, it } from "vitest";
import { runLength, streakFact } from "../src/modules/matches/preview.service";
import { maskEmail, scorePrediction } from "../src/modules/predictions/scoring";
import { detectNotice } from "../src/modules/push/push.service";
import { buildCalendar, fold, icsDate, icsText } from "../src/modules/calendar/ics";
import { headCoach, mapAbsences, mapOfficials, mapPlayerMatchStat } from "../src/integrations/kff/matchMappers";

describe("streaks", () => {
  it("measures the run at the start (most recent first)", () => {
    expect(runLength(["W", "W", "D", "W"], (r) => r === "W")).toBe(2);
    expect(runLength([], (r) => r === "W")).toBe(0);
  });
  it("prefers win streaks over unbeaten runs", () => {
    expect(streakFact(["W", "W", "W", "D"])).toEqual({ key: "winStreak", n: 3 });
    expect(streakFact(["W", "D", "W", "D", "L"])).toEqual({ key: "unbeaten", n: 4 });
    expect(streakFact(["L", "L", "L"])).toEqual({ key: "loseStreak", n: 3 });
    expect(streakFact(["D", "L", "D", "L", "W"])).toEqual({ key: "winless", n: 4 });
    expect(streakFact(["W", "L", "W"])).toBeNull();
  });
});

describe("predictor scoring", () => {
  const actual = { homeScore: 2, awayScore: 1 };
  it("awards 3 / 2 / 1 / 0", () => {
    expect(scorePrediction({ homeScore: 2, awayScore: 1 }, actual)).toBe(3);
    expect(scorePrediction({ homeScore: 3, awayScore: 2 }, actual)).toBe(2);
    expect(scorePrediction({ homeScore: 1, awayScore: 0 }, actual)).toBe(2);
    expect(scorePrediction({ homeScore: 3, awayScore: 0 }, actual)).toBe(1);
    expect(scorePrediction({ homeScore: 1, awayScore: 1 }, actual)).toBe(0);
    expect(scorePrediction({ homeScore: 0, awayScore: 0 }, { homeScore: 1, awayScore: 1 })).toBe(2);
  });
  it("masks emails", () => {
    expect(maskEmail("murasaki@gmail.com")).toBe("mu•••");
  });
});

describe("push notices", () => {
  const s = (status: "SCHEDULED" | "LIVE" | "HALFTIME" | "FINISHED", h: number | null, a: number | null) => ({ status, homeScore: h, awayScore: a });
  it("detects kick-off, goals, half time and full time", () => {
    expect(detectNotice(s("SCHEDULED", null, null), s("LIVE", 0, 0))).toBe("KICKOFF");
    expect(detectNotice(s("LIVE", 0, 0), s("LIVE", 1, 0))).toBe("GOAL");
    expect(detectNotice(s("LIVE", 1, 0), s("HALFTIME", 1, 0))).toBe("HALFTIME");
    expect(detectNotice(s("HALFTIME", 1, 0), s("FINISHED", 1, 0))).toBe("FULLTIME");
  });
  it("stays quiet on first sight and when nothing changed", () => {
    expect(detectNotice(null, s("LIVE", 2, 0))).toBeNull();
    expect(detectNotice(s("LIVE", 1, 0), s("LIVE", 1, 0))).toBeNull();
    expect(detectNotice(s("FINISHED", 1, 0), s("FINISHED", 1, 0))).toBeNull();
  });
});

describe("ics", () => {
  it("formats dates and escapes text", () => {
    expect(icsDate(new Date("2026-10-10T12:00:00Z"))).toBe("20261010T120000Z");
    expect(icsText("A, B; C")).toBe("A\\, B\\; C");
  });
  it("folds long lines at 75 octets without splitting characters", () => {
    const line = "SUMMARY:" + "Кайрат — Жетысу ".repeat(8);
    const folded = fold(line);
    for (const part of folded.split("\r\n")) expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
  it("builds a valid calendar", () => {
    const cal = buildCalendar("Кайрат", [
      { uid: "m1@qscore", start: new Date("2026-10-10T12:00:00Z"), duration: 120, summary: "Кайрат — Жетысу", location: "Алматы" },
    ]);
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal).toContain("DTEND:20261010T140000Z");
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
});

describe("match mappers", () => {
  it("maps per-player stats with fallbacks", () => {
    const s = mapPlayerMatchStat({
      player_id: 1,
      team_id: 2,
      minutes_played: 64,
      goals: 0,
      assists: null,
      yellow_cards: 0,
      red_cards: 0,
      extra_stats: { shot: 5, shots_on_goal: 1, xg: 0.137, pass: 18, pass_acc: 11, duel: 7, duel_success: 2, second_yellow_cards: 1 },
    });
    expect(s).toMatchObject({ minutes: 64, shots: 5, shotsOnTarget: 1, xg: 0.14, passes: 18, passesAccurate: 11, duels: 7, duelsWon: 2, redCards: 1 });
  });
  it("keeps referees in display order and picks the head coach", () => {
    const officials = mapOfficials(
      [
        { id: 2, first_name: "Юрий", last_name: "Тихонюк", role: "first_assistant" },
        { id: 1, first_name: "Данияр", last_name: "Сахи", role: "main" },
        { id: 3, first_name: "X", last_name: "Y", role: "match_inspector" },
      ],
      [{ id: 1, first_name: "Daniyar", last_name: "Sakhi", role: "main" }],
    );
    expect(officials).toEqual([
      { role: "main", name: "Данияр Сахи", nameEn: "Daniyar Sakhi" },
      { role: "first_assistant", name: "Юрий Тихонюк", nameEn: null },
    ]);
    expect(headCoach([{ id: 5, first_name: "Денис", last_name: "Мамонов", role: "Помощник тренера" }, { id: 6, first_name: "Ринат", last_name: "Алюетов", role: "Главный тренер" }], undefined)).toEqual({
      name: "Ринат Алюетов",
      nameEn: null,
    });
    expect(headCoach([{ id: 5, first_name: "A", last_name: "B", role: "Помощник тренера" }], undefined)).toBeNull();
  });
  it("maps suspensions per side", () => {
    const list = mapAbsences(
      { home_team: [{ player_id: 1195, first_name: "Рамазан", last_name: "Каримов", shirt_number: 12, reason_label: "Перебор жёлтых карточек", matches_suspended: 1 }], away_team: [] },
      null,
    );
    expect(list).toEqual([{ side: "home", playerExternalId: 1195, name: "Рамазан Каримов", nameEn: null, number: 12, reason: "Перебор жёлтых карточек", matchesSuspended: 1 }]);
  });
});

import { matchdaysByDate } from "../src/modules/leagues/archive.service";

describe("archive matchdays", () => {
  it("starts a new matchday after a 36h gap", () => {
    const m = (d: string) => ({ kickoff: `${d}T12:00:00.000Z`, round: 1 });
    const days = matchdaysByDate([m("2024-03-02"), m("2024-03-01"), m("2024-03-05"), m("2024-03-06"), m("2024-03-30")]);
    expect(days.map((d) => d.matches.length)).toEqual([2, 2, 1]);
    expect(days.map((d) => d.round)).toEqual([1, 2, 3]);
    expect(days[1].matches.every((x) => x.round === 2)).toBe(true);
  });
});
