import { useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper } from "lucide-react";
import { useNews } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatRelative } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Card, CardFooterLink, CardHeader } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";

/** News image with a neutral placeholder when missing or broken. */
function NewsImage({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div aria-hidden className={cn("flex items-center justify-center bg-surface-2 text-ink-3", className)}>
        <Newspaper size={18} />
      </div>
    );
  }
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn("bg-surface-2 object-cover object-top", className)} />;
}

function NewsSkeleton() {
  return (
    <div className="space-y-3 p-3" aria-busy="true">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-4 w-4/5" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-12 w-16 shrink-0" />
          <Skeleton className="h-10 flex-1" />
        </div>
      ))}
    </div>
  );
}

/** Latest headlines: a lead story with a large image, then compact rows. */
export function NewsCard() {
  const { t, locale } = useI18n();
  const news = useNews({ limit: 5 });

  return (
    <Card>
      <CardHeader title={t("sidebar.news")} icon={<Newspaper size={17} />} />
      <QueryState query={news} loading={<NewsSkeleton />}>
        {(items) => {
          if (items.length === 0) return <EmptyState title={t("news.none")} className="py-8" />;
          const [lead, ...rest] = items;
          return (
            <>
              <Link to={`/news/${lead.id}`} className="group block p-3 row-hover">
                <NewsImage src={lead.imageUrl} className="aspect-video w-full rounded-xl" />
                <p className="mt-2.5 line-clamp-3 text-sm font-bold leading-snug group-hover:text-brand">{lead.title}</p>
                <time dateTime={lead.publishedAt} className="mt-1 block text-xs text-ink-3">
                  {formatRelative(lead.publishedAt, locale)}
                </time>
              </Link>
              <ul className="divide-y divide-line border-t border-line">
                {rest.map((n) => (
                  <li key={n.id}>
                    <Link to={`/news/${n.id}`} className="group flex gap-3 px-3 py-2.5 row-hover">
                      <NewsImage src={n.imageUrl} className="h-12 w-16 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[13px] font-semibold leading-snug group-hover:text-brand">{n.title}</p>
                        <time dateTime={n.publishedAt} className="text-[11px] text-ink-3">
                          {formatRelative(n.publishedAt, locale)}
                        </time>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          );
        }}
      </QueryState>
      <CardFooterLink to="/news">{t("sidebar.moreNews")}</CardFooterLink>
    </Card>
  );
}
