import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { cn } from "@/shared/lib/utils";
import { IconButton } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { SearchBox } from "./SearchBox";
import { SettingsMenu } from "./SettingsMenu";

export const NAV_LINKS: { to: string; key: TranslationKey; end?: boolean }[] = [
  { to: "/", key: "nav.matches", end: true },
  { to: "/leagues", key: "nav.leagues" },
  { to: "/news", key: "nav.news" },
  { to: "/transfers", key: "nav.transfers" },
  { to: "/predictor", key: "nav.predictor" },
];

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-1 rounded-lg" aria-label="Qscore">
      <img src="/q-icon.png" alt="" className="h-9 w-9" width={36} height={36} />
      <span className="text-[22px] font-extrabold italic tracking-tight">score</span>
    </Link>
  );
}

export function Header() {
  const { t } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/75">
      <Container className="flex h-16 items-center gap-3 sm:gap-6">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex">
          {[...NAV_LINKS, { to: "/tv", key: "nav.tv" as TranslationKey }].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink",
                )
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden w-full max-w-xs sm:block lg:max-w-sm">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <IconButton aria-label={t("search.open")} aria-expanded={searchOpen} onClick={() => setSearchOpen((v) => !v)} className="sm:hidden">
            {searchOpen ? <X size={19} /> : <Search size={19} />}
          </IconButton>
          <SettingsMenu />
        </div>
      </Container>

      {searchOpen && (
        <div className="border-t border-line px-3 py-2.5 animate-fade-in sm:hidden">
          <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}
