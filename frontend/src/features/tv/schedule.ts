import type { Broadcaster, LeagueRef, TvMatch } from "@/shared/api/types";
import { dayKey } from "@/shared/lib/date";

/** The match's channels, plus its YouTube stream as a channel when no listed broadcaster already covers it. */
export function channelsOf(m: TvMatch): Broadcaster[] {
  const list = [...m.broadcasters];
  if (m.youtubeUrl && !list.some((b) => b.type === "youtube" || b.url === m.youtubeUrl)) {
    list.push({
      name: "YouTube",
      logoUrl: null,
      type: "youtube",
      url: m.youtubeUrl,
    });
  }
  return list;
}

/** Distinct channel names across the schedule, most frequent first. */
export function channelNames(matches: TvMatch[], locale: string): string[] {
  const counts = new Map<string, number>();
  for (const m of matches) for (const b of channelsOf(m)) counts.set(b.name, (counts.get(b.name) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale)).map(([name]) => name);
}

/** Distinct leagues, top tier first. */
export function leaguesOf(matches: TvMatch[]): LeagueRef[] {
  const bySlug = new Map(matches.map((m) => [m.league.slug, m.league]));
  return [...bySlug.values()].sort((a, b) => a.tier - b.tier);
}

/** Matches grouped by the viewer's local calendar day, in kick-off order. */
export function groupByDay(matches: TvMatch[]): { key: string; date: Date; matches: TvMatch[] }[] {
  const groups = new Map<string, { key: string; date: Date; matches: TvMatch[] }>();
  for (const m of [...matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff))) {
    const date = new Date(m.kickoff);
    const key = dayKey(date);
    const group = groups.get(key) ?? { key, date, matches: [] };
    group.matches.push(m);
    groups.set(key, group);
  }
  return [...groups.values()];
}
