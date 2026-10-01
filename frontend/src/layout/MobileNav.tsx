import { NavLink } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, Newspaper, Target, Trophy, type LucideIcon } from "lucide-react";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { NAV_LINKS } from "./Header";

const ICONS: Record<string, LucideIcon> = { "/": CalendarDays, "/leagues": Trophy, "/news": Newspaper, "/transfers": ArrowLeftRight, "/predictor": Target };

export function MobileNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {NAV_LINKS.map((l) => {
          const Icon = ICONS[l.to];
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold transition-colors active:scale-95",
                  isActive ? "text-brand" : "text-ink-3",
                )
              }
            >
              <Icon size={21} strokeWidth={2.1} />
              {t(l.key)}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
