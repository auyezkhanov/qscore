import crypto from "crypto";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { createLogger } from "../../lib/logger";

const log = createLogger("translate");

const DEEPL_URL = env.DEEPL_API_KEY.endsWith(":fx")
  ? "https://api-free.deepl.com/v2/translate"
  : "https://api.deepl.com/v2/translate";

export const translationAvailable = () => env.DEEPL_API_KEY.length > 0;

const cacheKey = (target: string, text: string) => crypto.createHash("sha256").update(`${target}:${text}`).digest("hex");

/**
 * Translates via DeepL with a permanent DB cache (a given source text never
 * changes its translation, so quota is only spent once). Returns null when
 * translation isn't configured or fails — callers keep the original text.
 */
export async function translate(text: string, target = "EN", html = false): Promise<string | null> {
  if (!text || !translationAvailable()) return null;
  const key = cacheKey(target, text);
  const hit = await prisma.translationCache.findUnique({ where: { key } });
  if (hit) return hit.translated;

  try {
    const res = await fetch(DEEPL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `DeepL-Auth-Key ${env.DEEPL_API_KEY}` },
      body: JSON.stringify({ text: [text], target_lang: target, ...(html ? { tag_handling: "html" } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`DeepL HTTP ${res.status}`);
    const data = (await res.json()) as { translations: { text: string }[] };
    const translated = data.translations[0]?.text;
    if (!translated) return null;
    await prisma.translationCache
      .create({ data: { key, targetLang: target, translated } })
      .catch(() => undefined /* a concurrent request cached it first */);
    return translated;
  } catch (err) {
    log.warn("DeepL translation failed", err);
    return null;
  }
}
