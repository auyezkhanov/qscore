import { describe, expect, it } from "vitest";
import {
  mapGameStatus,
  mapPosition,
  normalizeForm,
  parseKickoff,
  splitMinute,
  teamColor,
} from "../src/integrations/kff/mappers";

describe("parseKickoff", () => {
  it("interprets source times as Kazakhstan time (UTC+5)", () => {
    const r = parseKickoff("2026-10-10", "17:00");
    expect(r?.kickoff.toISOString()).toBe("2026-10-10T12:00:00.000Z");
    expect(r?.timeTbd).toBe(false);
  });

  it("flags a missing kickoff time instead of inventing one silently", () => {
    const r = parseKickoff("2026-10-10", null);
    expect(r?.timeTbd).toBe(true);
    expect(r?.kickoff.toISOString().slice(0, 10)).toBe("2026-10-10");
  });

  it("rejects garbage dates", () => {
    expect(parseKickoff("not-a-date", "12:00")).toBeNull();
  });
});

describe("mapGameStatus", () => {
  const base = { is_live: false, minute: null, live_phase: null, half: null };
  it("maps finished and technical defeats to FINISHED", () => {
    expect(mapGameStatus({ ...base, status: "finished" }).status).toBe("FINISHED");
    expect(mapGameStatus({ ...base, status: "technical_defeat" }).status).toBe("FINISHED");
  });
  it("keeps the live minute", () => {
    expect(mapGameStatus({ ...base, status: "upcoming", is_live: true, minute: 67 })).toEqual({ status: "LIVE", minute: 67 });
  });
  it("detects half time from the live phase", () => {
    expect(mapGameStatus({ ...base, status: "live", is_live: true, minute: 45, live_phase: "halftime" }).status).toBe("HALFTIME");
  });
  it("maps postponed / cancelled / upcoming", () => {
    expect(mapGameStatus({ ...base, status: "postponed" }).status).toBe("POSTPONED");
    expect(mapGameStatus({ ...base, status: "cancelled" }).status).toBe("CANCELLED");
    expect(mapGameStatus({ ...base, status: "upcoming" }).status).toBe("SCHEDULED");
  });
});

describe("splitMinute", () => {
  it("splits stoppage time per half", () => {
    expect(splitMinute(47, 1)).toEqual({ minute: 45, addedTime: 2 });
    expect(splitMinute(94, 2)).toEqual({ minute: 90, addedTime: 4 });
  });
  it("leaves regular minutes alone", () => {
    expect(splitMinute(47, 2)).toEqual({ minute: 47, addedTime: null });
    expect(splitMinute(30, null)).toEqual({ minute: 30, addedTime: null });
  });
});

describe("normalizeForm / mapPosition / teamColor", () => {
  it("keeps only W/D/L letters, comma separated", () => {
    expect(normalizeForm("wdL x W")).toBe("W,D,L,W");
    expect(normalizeForm(null)).toBe("");
  });
  it("falls back through code, player type and amplua", () => {
    expect(mapPosition("GK")).toBe("GK");
    expect(mapPosition(null, "defence")).toBe("DF");
    expect(mapPosition(null, null, "AM")).toBe("MF");
    expect(mapPosition(null, null, null)).toBe("MF");
  });
  it("gives a stable colour for unknown clubs", () => {
    expect(teamColor("Неизвестный ФК")).toBe(teamColor("Неизвестный ФК"));
    expect(teamColor("Кайрат")).toBe("#EAB308");
  });
});
