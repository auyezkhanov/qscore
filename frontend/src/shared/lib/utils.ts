export { clsx as cn } from "clsx";

/** YouTube watch/short URL -> embeddable URL; null if it isn't a YouTube video link. */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.hostname.endsWith("youtube.com")) {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function formatNumber(n: number, locale: string): string {
  return n.toLocaleString(locale);
}

/** Signed number for goal difference style values: +5, 0, -3. */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

// Windows ships no flag glyphs and renders regional indicators as bare letters ("KZ").
const flagsSupported = typeof navigator === "undefined" || !/Windows/i.test(navigator.userAgent);

/** Emoji flag for an ISO-3166 alpha-2 code; empty where the platform can't draw flags. */
export function flagEmoji(code: string | null | undefined): string {
  if (!flagsSupported || !code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Result of a finished match from one team's perspective. */
export function resultFor(m: { homeTeam: { id: string }; homeScore: number | null; awayScore: number | null }, teamId: string): "W" | "D" | "L" | null {
  if (m.homeScore == null || m.awayScore == null) return null;
  const isHome = m.homeTeam.id === teamId;
  const gf = isHome ? m.homeScore : m.awayScore;
  const ga = isHome ? m.awayScore : m.homeScore;
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

const moneyFormats = new Map<string, Intl.NumberFormat>();

/** Compact euro amount in the UI locale: "€1.2M" / "1,2 млн €". */
export function formatMoney(amount: number, locale: string): string {
  let f = moneyFormats.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });
    moneyFormats.set(locale, f);
  }
  return f.format(amount);
}
