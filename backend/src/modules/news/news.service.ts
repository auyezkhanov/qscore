import { safeUrl } from "../../lib/url";
import { TtlCache } from "../../lib/cache";
import { HttpError, notFound } from "../../lib/http";
import { createLogger } from "../../lib/logger";
import type { Lang } from "../../lib/i18n";
import { kff, KffError } from "../../integrations/kff/client";
import type { NewsArticle, NewsListItem } from "../../integrations/kff/types";
import { LEAGUE_BY_CODE, LEAGUE_BY_SLUG } from "../../sync/config";
import { translate } from "./translate";

const log = createLogger("news");
const listCache = new TtlCache<NewsListItem[]>(3 * 60 * 1000, 50);
const articleCache = new TtlCache<NewsArticle>(15 * 60 * 1000, 300);

export type NewsSummary = {
  id: number;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: string;
  leagueSlug: string | null;
  /** Language the text is actually in (English is only available with DeepL configured). */
  lang: Lang;
};

function toSummary(item: NewsListItem): NewsSummary {
  return {
    id: item.id,
    title: item.title,
    excerpt: item.excerpt,
    imageUrl: item.image_url,
    publishedAt: item.publish_date,
    leagueSlug: (item.championship_code && LEAGUE_BY_CODE.get(item.championship_code)?.slug) ?? null,
    lang: "ru",
  };
}

async function toEnglish<T extends NewsSummary>(item: T): Promise<T> {
  const [title, excerpt] = await Promise.all([translate(item.title), item.excerpt ? translate(item.excerpt) : null]);
  if (!title) return item;
  return { ...item, title, excerpt: excerpt ?? item.excerpt, lang: "en" };
}

function upstreamError(err: unknown): never {
  log.warn("news upstream failed", err);
  throw new HttpError(502, "UPSTREAM_UNAVAILABLE", "News are temporarily unavailable");
}

export async function listNews(opts: { league?: string; limit: number }, lang: Lang) {
  const codes = opts.league
    ? [LEAGUE_BY_SLUG.get(opts.league)?.code].filter((c): c is string => !!c)
    : [...LEAGUE_BY_CODE.keys()];
  if (codes.length === 0) throw notFound("League");

  const lists = await Promise.all(
    codes.map((code) => listCache.get(`${code}:${opts.limit}`, () => kff.news({ championshipCode: code, limit: opts.limit }).then((r) => r.items))),
  ).catch(upstreamError);

  const seen = new Set<number>();
  const items = lists
    .flat()
    .filter((i) => !seen.has(i.id) && seen.add(i.id))
    .sort((a, b) => (a.publish_date < b.publish_date ? 1 : a.publish_date > b.publish_date ? -1 : b.id - a.id))
    .slice(0, opts.limit)
    .map(toSummary);

  return lang === "en" ? Promise.all(items.map(toEnglish)) : items;
}

export async function getArticle(id: number, lang: Lang) {
  const article = await articleCache.get(String(id), () => kff.newsArticle(id)).catch((err) => {
    if (err instanceof KffError && err.status === 404) throw notFound("Article");
    return upstreamError(err);
  });

  const base = { ...toSummary(article), content: article.content, sourceUrl: safeUrl(article.source_url) };
  if (lang !== "en") return base;

  const [summary, content] = await Promise.all([toEnglish(base), article.content ? translate(article.content, "EN", true) : null]);
  return summary.lang === "en" ? { ...summary, content: content ?? article.content } : base;
}
