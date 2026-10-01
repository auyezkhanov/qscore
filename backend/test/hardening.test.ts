import { describe, expect, it } from "vitest";
import { createLimiter } from "../src/lib/limiter";
import { TtlCache } from "../src/lib/cache";
import { safeUrl } from "../src/lib/url";
import { isAllowedPushEndpoint } from "../src/modules/push/push.service";
import { normalizeImageUrl } from "../src/modules/media/media.routes";
import { scheduleChanged } from "../src/sync/matches";
import { buildCalendar } from "../src/modules/calendar/ics";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("createLimiter", () => {
  it("never runs more than `concurrency` tasks at once", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      limit(async () => {
        active++;
        peak = Math.max(peak, active);
        await tick();
        active--;
      });
    await Promise.all(Array.from({ length: 7 }, task));
    expect(peak).toBe(2);
  });

  it("keeps going after a task rejects", async () => {
    const limit = createLimiter(1);
    await expect(limit(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(limit(async () => 42)).resolves.toBe(42);
  });

  it("spaces task starts by at least minGapMs", async () => {
    const limit = createLimiter(5, 30);
    const starts: number[] = [];
    await Promise.all(Array.from({ length: 3 }, () => limit(async () => void starts.push(Date.now()))));
    expect(starts[2] - starts[0]).toBeGreaterThanOrEqual(55);
  });
});

describe("TtlCache stale-if-error", () => {
  it("serves the expired value when a refresh fails", async () => {
    const cache = new TtlCache<string>(1);
    await cache.get("k", async () => "old");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(cache.get("k", () => Promise.reject(new Error("down")))).resolves.toBe("old");
  });

  it("propagates the error when there is nothing to fall back to", async () => {
    const cache = new TtlCache<string>(1000);
    await expect(cache.get("k", () => Promise.reject(new Error("down")))).rejects.toThrow("down");
  });
});

describe("safeUrl", () => {
  it("keeps http(s) links and drops everything else", () => {
    expect(safeUrl("https://youtu.be/abc")).toBe("https://youtu.be/abc");
    expect(safeUrl(" http://kffleague.kz/x ")).toBe("http://kffleague.kz/x");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl("/relative")).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe("isAllowedPushEndpoint", () => {
  it("accepts real browser push services", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QF")).toBe(true);
  });

  it("rejects anything that could turn the server into a proxy", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isAllowedPushEndpoint("https://evil.com/fcm.googleapis.com")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://push.services.mozilla.com.evil.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});

describe("normalizeImageUrl", () => {
  it("canonicalizes allowed storage URLs", () => {
    expect(normalizeImageUrl("https://kffleague.kz/storage/a/b.png?v=1#x")).toBe("https://kffleague.kz/storage/a/b.png");
  });

  it("rejects other hosts, schemes, paths and credentials", () => {
    expect(normalizeImageUrl("http://kffleague.kz/storage/a.png")).toBeNull();
    expect(normalizeImageUrl("https://evil.kz/storage/a.png")).toBeNull();
    expect(normalizeImageUrl("https://kffleague.kz/api/v1/players")).toBeNull();
    expect(normalizeImageUrl("https://kffleague.kz:8443/storage/a.png")).toBeNull();
    expect(normalizeImageUrl("https://user:pw@kffleague.kz/storage/a.png")).toBeNull();
    expect(normalizeImageUrl("nonsense")).toBeNull();
  });
});

describe("scheduleChanged", () => {
  const stored = { kickoff: new Date("2026-05-01T14:00:00Z"), homeScore: 1, broadcasters: [{ name: "Qazsport", type: "tv", url: null }] };

  it("is false when nothing differs (dates by value, json regardless of key order)", () => {
    expect(scheduleChanged(stored, { kickoff: new Date("2026-05-01T14:00:00Z"), homeScore: 1, broadcasters: [{ url: null, type: "tv", name: "Qazsport" }] })).toBe(false);
  });

  it("detects a changed field", () => {
    expect(scheduleChanged(stored, { homeScore: 2 })).toBe(true);
    expect(scheduleChanged(stored, { kickoff: new Date("2026-05-01T15:00:00Z") })).toBe(true);
    expect(scheduleChanged({ minute: null }, { minute: 12 })).toBe(true);
  });
});

describe("ics all-day events", () => {
  it("uses the Kazakhstan calendar date when the kick-off time is unknown", () => {
    const ics = buildCalendar("t", [{ uid: "1@q", start: new Date("2026-05-01T21:00:00Z"), duration: 120, summary: "A — B", allDay: true }]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260502");
    expect(ics).toContain("DTEND;VALUE=DATE:20260503");
  });
});
