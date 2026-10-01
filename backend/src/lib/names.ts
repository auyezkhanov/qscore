import { transliterate } from "./i18n";

// Fuzzy person-name matching across sources that romanize Kazakh/Russian names
// differently ("Alexandr"/"Aleksandr", "Zhaksylykov"/"Jaksylykov", "Yuriy"/"Yuri").

/** Lowercase Latin tokens with spelling variants folded together. */
export function nameTokens(name: string): string[] {
  return transliterate(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1)
    .map((t) =>
      t
        .replace(/x/g, "ks")
        .replace(/kh/g, "h")
        .replace(/j/g, "zh")
        .replace(/zhzh/g, "zh")
        .replace(/y/g, "i")
        .replace(/ii/g, "i")
        .replace(/(.)\1+/g, "$1"),
    );
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

const tokensMatch = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && editDistance(a, b) <= 1);

/**
 * 0..1: share of the shorter name's tokens found in the other name. Full
 * names that only share a common first name score ≤ 0.5, surname+first ≈ 1.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let hits = 0;
  for (const t of short) {
    const idx = long.findIndex((u, i) => !used.has(i) && tokensMatch(t, u));
    if (idx >= 0) {
      used.add(idx);
      hits++;
    }
  }
  return hits / short.length;
}
