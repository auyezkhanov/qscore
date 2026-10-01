import { describe, expect, it } from "vitest";
import { addDays, dayKey, dayRange, parseDayKey } from "./date";
import { flagEmoji, resultFor, signed, youtubeEmbedUrl } from "./utils";

describe("local calendar days", () => {
  it("round-trips a day key through local midnight", () => {
    const d = parseDayKey("2026-10-10")!;
    expect(d.getHours()).toBe(0);
    expect(dayKey(d)).toBe("2026-10-10");
  });

  it("rejects malformed or impossible dates", () => {
    expect(parseDayKey("2026-02-30")).toBeNull();
    expect(parseDayKey("10/10/2026")).toBeNull();
    expect(parseDayKey(null)).toBeNull();
  });

  it("uses the local day, not the UTC one", () => {
    // 23:30 local on Oct 10 must still belong to Oct 10 in any time zone.
    const lateEvening = new Date(2026, 9, 10, 23, 30);
    expect(dayKey(lateEvening)).toBe("2026-10-10");
  });

  it("spans exactly one local day", () => {
    const { from, to } = dayRange(new Date(2026, 9, 10, 15));
    expect(new Date(from).getTime()).toBe(new Date(2026, 9, 10).getTime());
    expect(new Date(to).getTime()).toBe(new Date(2026, 9, 11).getTime());
  });

  it("adds days across month boundaries", () => {
    expect(dayKey(addDays(new Date(2026, 9, 31), 1))).toBe("2026-11-01");
  });
});

describe("utils", () => {
  it("builds YouTube embed URLs and rejects others", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=kZzPixnjjZY")).toBe("https://www.youtube.com/embed/kZzPixnjjZY");
    expect(youtubeEmbedUrl("https://youtu.be/kZzPixnjjZY")).toBe("https://www.youtube.com/embed/kZzPixnjjZY");
    expect(youtubeEmbedUrl("https://www.youtube.com/live/kZzPixnjjZY")).toBe("https://www.youtube.com/embed/kZzPixnjjZY");
    expect(youtubeEmbedUrl("https://example.com/watch?v=kZzPixnjjZY")).toBeNull();
    expect(youtubeEmbedUrl("not a url")).toBeNull();
  });

  it("formats signed numbers and flags", () => {
    expect(signed(3)).toBe("+3");
    expect(signed(0)).toBe("0");
    expect(signed(-2)).toBe("-2");
    expect(flagEmoji("KZ")).toBe("🇰🇿");
    expect(flagEmoji(null)).toBe("");
  });

  it("computes a result from one team's perspective", () => {
    const m = { homeTeam: { id: "a" }, homeScore: 2, awayScore: 1 };
    expect(resultFor(m, "a")).toBe("W");
    expect(resultFor(m, "b")).toBe("L");
    expect(resultFor({ ...m, awayScore: 2 }, "a")).toBe("D");
    expect(resultFor({ ...m, homeScore: null }, "a")).toBeNull();
  });
});
