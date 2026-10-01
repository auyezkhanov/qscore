import { Link } from "react-router-dom";
import type { NewsSummary } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { CardHeader } from "@/shared/ui/Card";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { Skeleton } from "@/shared/ui/Skeleton";
import { formatNewsTime } from "./newsDate";
import { NewsImage, NewsMeta, useNewsLeagueName } from "./NewsParts";

/** Large lead story: photo with a dark gradient and the headline laid over it. */
export function FeaturedNewsCard({ item, className }: { item: NewsSummary; className?: string }) {
  const { locale } = useI18n();
  const league = useNewsLeagueName(item.leagueSlug);
  return (
    <Link
      to={`/news/${item.id}`}
      className={cn(
        "group relative isolate flex min-h-[280px] flex-col justify-end overflow-hidden rounded-card bg-brand-900 shadow-card sm:min-h-[380px] lg:min-h-[440px]",
        className,
      )}
    >
      <NewsImage
        src={item.imageUrl}
        iconSize={64}
        className="absolute inset-0 -z-10 h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/0" />
      <div className="space-y-3 p-5 sm:p-7">
        {league && item.leagueSlug && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1 pl-1 pr-2.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-md">
            <LeagueBadge slug={item.leagueSlug} size="sm" />
            {league}
          </span>
        )}
        <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white [text-wrap:balance] sm:text-3xl">{item.title}</h2>
        {item.excerpt && <p className="line-clamp-2 max-w-2xl text-sm text-white/80 sm:text-[15px]">{item.excerpt}</p>}
        <time dateTime={item.publishedAt} className="block text-xs font-medium text-white/70">
          {formatNewsTime(item.publishedAt, locale)}
        </time>
      </div>
    </Link>
  );
}

/** Numbered "top stories" list with small thumbnails, shown next to the lead story. */
export function NewsHeadlineList({ items, className }: { items: NewsSummary[]; className?: string }) {
  const { t } = useI18n();
  return (
    <section className={cn("card flex flex-col overflow-hidden", className)}>
      <CardHeader title={t("news.headlines")} />
      <ol className="flex flex-1 flex-col divide-y divide-line">
        {items.map((item, i) => (
          <li key={item.id} className="flex-1">
            <Link to={`/news/${item.id}`} className="group flex h-full items-center gap-3 px-4 py-3 row-hover sm:px-5">
              <span className="w-5 shrink-0 text-center text-lg font-extrabold text-ink-3 tnum">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="line-clamp-3 text-sm font-semibold leading-snug group-hover:text-brand">{item.title}</h3>
                <NewsMeta item={item} />
              </div>
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                <NewsImage src={item.imageUrl} iconSize={18} className="absolute inset-0 h-full w-full" />
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Grid card: 16:9 photo, league + time, title and a short excerpt. */
export function NewsCard({ item }: { item: NewsSummary }) {
  return (
    <Link to={`/news/${item.id}`} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        <NewsImage
          src={item.imageUrl}
          className="absolute inset-0 h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <NewsMeta item={item} />
        <h3 className="line-clamp-3 text-[15px] font-bold leading-snug tracking-tight group-hover:text-brand">{item.title}</h3>
        {item.excerpt && <p className="line-clamp-2 text-sm text-ink-2">{item.excerpt}</p>}
      </div>
    </Link>
  );
}

export function NewsGrid({ items }: { items: NewsSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export function NewsPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[280px] rounded-card sm:h-[380px] lg:h-[440px]" />
        <div className="card hidden space-y-4 p-5 lg:block">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 pt-3">
              <Skeleton className="h-4 w-5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-14 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <div aria-hidden className="aspect-video animate-pulse bg-surface-3/70" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
