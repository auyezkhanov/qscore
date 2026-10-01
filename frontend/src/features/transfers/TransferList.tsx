import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import type { Transfer } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { CardFooterLink, CardHeader } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Segmented } from "@/shared/ui/Chip";
import type { TransferSort } from "./useTransferFilters";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { TransferRow } from "./TransferRow";

const PAGE_SIZE = 40;

function TransferRowsSkeleton() {
  return (
    <div className="divide-y divide-line" aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-7 w-48 sm:block" />
        </div>
      ))}
    </div>
  );
}

function Rows({ transfers }: { transfers: Transfer[] }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(PAGE_SIZE);
  if (transfers.length === 0) return <EmptyState icon={<ArrowLeftRight size={22} />} title={t("transfers.none")} />;
  return (
    <>
      <div className="divide-y divide-line">
        {transfers.slice(0, visible).map((tr) => (
          <TransferRow key={tr.id} transfer={tr} />
        ))}
      </div>
      {visible < transfers.length && <CardFooterLink onClick={() => setVisible((v) => v + PAGE_SIZE)}>{t("common.showMore")}</CardFooterLink>}
    </>
  );
}

/**
 * Transfers card. While a new filter is loading the previous results stay
 * visible (dimmed) with a spinner in the header. `resetKey` restarts paging.
 */
export function TransferList({
  query,
  sort,
  onSort,
  resetKey,
}: {
  query: UseQueryResult<Transfer[]>;
  sort: TransferSort;
  onSort: (sort: TransferSort) => void;
  resetKey: string;
}) {
  const { t } = useI18n();
  const refreshing = query.isFetching && query.data !== undefined;
  return (
    <section className="card overflow-hidden">
      <CardHeader
        title={t("transfers.title")}
        icon={<ArrowLeftRight size={16} />}
        action={
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink-3 tnum">
            {refreshing && <Loader2 size={14} className="animate-spin text-brand" aria-label={t("common.loading")} />}
            {query.data && t("transfers.count", { n: query.data.length })}
          </span>
        }
      />
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="text-xs font-semibold text-ink-3">{t("transfers.sort")}</span>
        <Segmented<TransferSort>
          size="sm"
          value={sort}
          onChange={onSort}
          options={[
            { value: "recent", label: t("transfers.sort.recent") },
            { value: "fee", label: t("transfers.sort.fee") },
          ]}
        />
      </div>
      <div className={cn("transition-opacity", query.isPlaceholderData && "pointer-events-none opacity-50")} aria-busy={query.isFetching}>
        <QueryState query={query} loading={<TransferRowsSkeleton />}>
          {(transfers) => <Rows key={resetKey} transfers={transfers} />}
        </QueryState>
      </div>
      <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-3">{t("transfers.tmSource")}</p>
    </section>
  );
}
