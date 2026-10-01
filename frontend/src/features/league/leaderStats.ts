import type { LeaderStat } from "@/shared/api/types";
import { formatMoney } from "@/shared/lib/utils";

export type StatGroup = "top" | "attack" | "defence" | "goalkeeping" | "discipline" | "other";

/** Leaderboards grouped the way FotMob lists them. */
export const STAT_GROUPS: { key: StatGroup; stats: LeaderStat[] }[] = [
  { key: "top", stats: ["goals", "assists", "rating", "xg"] },
  { key: "attack", stats: ["shots", "shotsOnTarget", "keyPasses", "dribblesWon"] },
  { key: "defence", stats: ["tackles", "interceptions"] },
  { key: "goalkeeping", stats: ["saves", "cleanSheets"] },
  { key: "discipline", stats: ["yellowCards", "redCards"] },
  { key: "other", stats: ["minutesPlayed", "marketValue"] },
];

export const ALL_STATS: LeaderStat[] = STAT_GROUPS.flatMap((g) => g.stats);

export const isLeaderStat = (s: string | null): s is LeaderStat => !!s && (ALL_STATS as string[]).includes(s);

export const groupOf = (stat: LeaderStat): StatGroup => STAT_GROUPS.find((g) => g.stats.includes(stat))?.key ?? "top";

const decimals = new Map<string, Intl.NumberFormat>();

/** Fixed-precision number in the UI locale ("7,94" in Russian). */
export function formatDecimal(n: number, locale: string, digits: number): string {
  const key = `${locale}:${digits}`;
  let f = decimals.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    decimals.set(key, f);
  }
  return f.format(n);
}

/** A leaderboard figure formatted for its stat (rating 2 dp, xG 1–2 dp, money compact). */
export function formatStat(stat: LeaderStat, value: number, locale: string): string {
  switch (stat) {
    case "rating":
      return formatDecimal(value, locale, 2);
    case "xg":
      return formatDecimal(value, locale, value >= 10 ? 1 : 2);
    case "marketValue":
      return formatMoney(value, locale);
    default:
      return value.toLocaleString(locale);
  }
}
