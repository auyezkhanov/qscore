import { useLeagues } from "@/shared/api/queries";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Page } from "@/shared/ui/Container";
import { Skeleton } from "@/shared/ui/Skeleton";
import { QueryState } from "@/shared/ui/States";
import { LeagueTile } from "@/features/home/LeagueTile";
import { ComingSoonCup, byTier } from "@/features/home/LeaguesCard";

export default function LeaguesPage() {
  const { t } = useI18n();
  const leagues = useLeagues();
  useDocumentTitle(t("nav.leagues"));

  return (
    <Page>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="px-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("nav.leagues")}</h1>
        <QueryState
          query={leagues}
          errorClassName="card"
          loading={
            <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-[116px] rounded-card" />
              ))}
            </div>
          }
        >
          {(list) => (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...list].sort(byTier).map((l) => (
                <LeagueTile key={l.slug} league={l} />
              ))}
              <div className="flex items-center rounded-card border border-dashed border-line p-4 sm:px-5">
                <ComingSoonCup />
              </div>
            </div>
          )}
        </QueryState>
      </div>
    </Page>
  );
}
