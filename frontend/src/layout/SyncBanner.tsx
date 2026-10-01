import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { request } from "@/shared/api/client";
import type { Health } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Container } from "@/shared/ui/Container";

/** Shown only on a fresh install while the first sync is still filling the database. */
export function SyncBanner() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: () => request<Health>("/health"),
    refetchInterval: (q) => (q.state.data && !q.state.data.ready ? 5_000 : false),
    staleTime: Infinity,
  });
  if (!data || data.ready) return null;
  return (
    <div className="border-b border-brand/20 bg-brand/10 text-brand-700 dark:text-brand-200">
      <Container className="flex items-center gap-2 py-2 text-[13px] font-medium">
        <RefreshCw size={14} className="animate-spin" />
        {t("common.syncing")}
      </Container>
    </div>
  );
}
