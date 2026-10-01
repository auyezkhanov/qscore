import { Newspaper } from "lucide-react";
import { NewsGrid, NewsHeadlineList, FeaturedNewsCard, NewsPageSkeleton } from "@/features/news/NewsCards";
import { OriginalLanguageNote } from "@/features/news/NewsParts";
import { useNews } from "@/shared/api/queries";
import type { NewsSummary } from "@/shared/api/types";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { Segmented } from "@/shared/ui/Chip";
import { Page } from "@/shared/ui/Container";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { useTabParam } from "@/shared/ui/Tabs";

const FILTERS = ["all", "kpl", "birinshi-liga"] as const;
type Filter = (typeof FILTERS)[number];

function NewsFeed({ items }: { items: NewsSummary[] }) {
  const { t } = useI18n();
  if (items.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={<Newspaper size={22} />} title={t("news.none")} />
      </div>
    );
  }
  const [lead, ...others] = items;
  const headlines = others.slice(0, 4);
  const rest = others.slice(4);
  return (
    <div className="space-y-4">
      <div className={cn("grid gap-4", headlines.length > 0 && "lg:grid-cols-[minmax(0,1fr)_380px]")}>
        <FeaturedNewsCard item={lead} />
        {headlines.length > 0 && <NewsHeadlineList items={headlines} />}
      </div>
      {rest.length > 0 && <NewsGrid items={rest} />}
    </div>
  );
}

export default function NewsPage() {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useTabParam<Filter>(FILTERS, "all");
  const query = useNews({ league: filter === "all" ? undefined : filter, limit: 24 });
  useDocumentTitle(t("news.title"));

  const untranslated = lang === "en" && !!query.data?.some((n) => n.lang === "ru");

  return (
    <Page>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{t("news.title")}</h1>
        <Segmented
          value={filter}
          onChange={setFilter}
          className="w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
          options={[
            { value: "all", label: t("news.all") },
            { value: "kpl", label: t("league.kpl") },
            { value: "birinshi-liga", label: t("league.birinshi-liga") },
          ]}
        />
      </div>

      {untranslated && <OriginalLanguageNote />}

      <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")} aria-busy={query.isFetching}>
        <QueryState query={query} loading={<NewsPageSkeleton />}>
          {(items) => <NewsFeed items={items} />}
        </QueryState>
      </div>
    </Page>
  );
}
