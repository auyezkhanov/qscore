import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Page } from "@/shared/ui/Container";
import { NotFoundState } from "@/shared/ui/States";

export default function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle(t("notFound.title"));
  return (
    <Page>
      <div className="py-6 sm:py-10">
        <NotFoundState />
      </div>
    </Page>
  );
}
