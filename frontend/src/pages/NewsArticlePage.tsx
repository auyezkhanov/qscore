import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ArticleContent } from "@/features/news/ArticleContent";
import { formatNewsDate } from "@/features/news/newsDate";
import { NewsImage, OriginalLanguageNote, useNewsLeagueName } from "@/features/news/NewsParts";
import { useNewsArticle } from "@/shared/api/queries";
import type { NewsArticle } from "@/shared/api/types";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Page } from "@/shared/ui/Container";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { Skeleton } from "@/shared/ui/Skeleton";
import { NotFoundState, QueryState } from "@/shared/ui/States";

function ArticleSkeleton() {
  return (
    <div className="card space-y-5 p-5 sm:p-8" aria-busy="true">
      <Skeleton className="h-6 w-40 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
      <Skeleton className="aspect-video w-full rounded-xl" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

function Article({ article }: { article: NewsArticle }) {
  const { t, lang, locale } = useI18n();
  const league = useNewsLeagueName(article.leagueSlug);

  return (
    <article className="card overflow-hidden p-5 sm:p-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-3">
          {league && article.leagueSlug && (
            <Link
              to={`/league/${article.leagueSlug}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1 pr-2.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <LeagueBadge slug={article.leagueSlug} size="sm" />
              {league}
            </Link>
          )}
          <time dateTime={article.publishedAt}>{formatNewsDate(article.publishedAt, locale)}</time>
        </div>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-[34px] sm:leading-[1.15]">
          {article.title}
        </h1>
        {lang !== article.lang && <OriginalLanguageNote />}
      </header>

      {article.imageUrl && (
        <div className="relative mt-6 aspect-video max-h-[440px] w-full overflow-hidden rounded-xl bg-surface-2">
          <NewsImage src={article.imageUrl} iconSize={48} className="absolute inset-0 h-full w-full" />
        </div>
      )}

      <div className="mt-6">
        {article.content ? (
          <ArticleContent html={article.content} />
        ) : (
          article.excerpt && <p className="text-[15px] leading-7 text-ink-2 sm:text-base">{article.excerpt}</p>
        )}
      </div>

      {article.sourceUrl && (
        <footer className="mt-8 border-t border-line pt-5">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            {t("news.source")}
            <ExternalLink size={14} />
          </a>
        </footer>
      )}
    </article>
  );
}

export default function NewsArticlePage() {
  const { id = "" } = useParams();
  const { t } = useI18n();
  const query = useNewsArticle(id);
  useDocumentTitle(query.data?.title ?? t("news.title"));
  // The hook is disabled for non-numeric ids, so they would otherwise load forever.
  const validId = /^\d+$/.test(id);

  return (
    <Page>
      <div className="mx-auto max-w-[720px] space-y-4">
        <Link
          to="/news"
          className="-ml-1 inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} />
          {t("news.back")}
        </Link>
        {validId ? (
          <QueryState query={query} loading={<ArticleSkeleton />} notFound={<NotFoundState titleKey="notFound.article" />}>
            {(article) => <Article article={article} />}
          </QueryState>
        ) : (
          <NotFoundState titleKey="notFound.article" />
        )}
      </div>
    </Page>
  );
}
