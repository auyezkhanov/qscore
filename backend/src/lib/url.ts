/**
 * Accepts only absolute http(s) URLs from third-party data. Anything else
 * (javascript:, data:, relative junk) becomes null so it can never end up in an href.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
