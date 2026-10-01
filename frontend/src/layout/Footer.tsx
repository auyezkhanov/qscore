import { Link } from "react-router-dom";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Container } from "@/shared/ui/Container";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-8 border-t border-line pb-24 pt-6 text-xs text-ink-3 lg:pb-8">
      <Container className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <span>
          © {new Date().getFullYear()} {t("footer.rights")}
        </span>
        <span className="flex items-center gap-4">
          <Link to="/tv" className="hover:text-ink">
            {t("nav.tv")}
          </Link>
          <Link to="/about" className="hover:text-ink">
            {t("nav.about")}
          </Link>
          <a href="https://kffleague.kz" target="_blank" rel="noreferrer" className="hover:text-ink">
            {t("footer.data")}
          </a>
        </span>
      </Container>
    </footer>
  );
}
