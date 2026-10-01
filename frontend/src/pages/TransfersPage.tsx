import { TransferFilters } from "@/features/transfers/TransferFilters";
import { TransferList } from "@/features/transfers/TransferList";
import { useTransferFilters } from "@/features/transfers/useTransferFilters";
import { useLeagueTransfers } from "@/shared/api/queries";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Page } from "@/shared/ui/Container";

export default function TransfersPage() {
  const { t } = useI18n();
  const { filters, setLeague, setTeam, setPosition, setSort, reset, isFiltered } = useTransferFilters();
  const query = useLeagueTransfers(filters.league, { team: filters.team, position: filters.position, sort: filters.sort });
  useDocumentTitle(t("transfers.title"));

  return (
    <Page>
      <h1 className="sr-only">{t("transfers.title")}</h1>
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <TransferFilters
          filters={filters}
          isFiltered={isFiltered}
          onLeague={setLeague}
          onTeam={setTeam}
          onPosition={setPosition}
          onReset={reset}
          className="lg:sticky lg:top-20"
        />
        <TransferList
          query={query}
          sort={filters.sort}
          onSort={setSort}
          resetKey={`${filters.league}|${filters.team ?? ""}|${filters.position ?? ""}|${filters.sort}`}
        />
      </div>
    </Page>
  );
}
