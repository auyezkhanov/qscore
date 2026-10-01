import { useCallback, useRef, useState } from "react";
import { BellOff, BellRing, ChevronRight, Loader2, LogOut, Monitor, Moon, Settings, Sun, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthModal, type AuthMode } from "@/features/auth/AuthModal";
import { usePush } from "@/features/push/PushProvider";
import { useTheme, type ThemePreference } from "@/features/theme/ThemeProvider";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { useDismiss } from "@/shared/hooks/useDismiss";
import { cn } from "@/shared/lib/utils";
import { IconButton } from "@/shared/ui/Button";
import { Segmented } from "@/shared/ui/Chip";

export function SettingsMenu() {
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setOpen(false);
  };
  const row = "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold";

  return (
    <>
      <div ref={root} className="relative">
        <IconButton aria-label={t("settings.title")} aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn(open && "bg-surface-2 text-ink")}>
          {user ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold uppercase text-brand-fg">{user.email[0]}</span>
          ) : (
            <Settings size={19} />
          )}
        </IconButton>

        {open && (
          <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-pop-in">
            {user ? (
              <div className="border-b border-line px-4 py-3">
                <p className="text-xs text-ink-3">{t("settings.signedInAs")}</p>
                <p className="truncate text-sm font-semibold">{user.email}</p>
                <p className="mt-1 text-xs text-ink-3">{t("settings.syncHint")}</p>
              </div>
            ) : (
              <div className="border-b border-line p-2">
                <button type="button" onClick={() => openAuth("login")} className={cn(row, "rounded-xl row-hover")}>
                  <span className="flex items-center gap-2.5">
                    <UserRound size={17} className="text-ink-3" />
                    {t("settings.login")}
                  </span>
                  <ChevronRight size={16} className="text-ink-3" />
                </button>
                <button type="button" onClick={() => openAuth("register")} className={cn(row, "rounded-xl text-brand row-hover")}>
                  {t("settings.register")}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <div className={row}>
              {t("settings.theme")}
              <Segmented<ThemePreference>
                size="sm"
                value={preference}
                onChange={setPreference}
                options={[
                  { value: "light", label: <Sun size={14} />, ariaLabel: t("settings.theme.light") },
                  { value: "system", label: <Monitor size={14} />, ariaLabel: t("settings.theme.system") },
                  { value: "dark", label: <Moon size={14} />, ariaLabel: t("settings.theme.dark") },
                ]}
              />
            </div>
            <div className={row}>
              {t("settings.language")}
              <Segmented
                size="sm"
                value={lang}
                onChange={setLang}
                options={[
                  { value: "ru", label: "RU" },
                  { value: "en", label: "EN" },
                ]}
              />
            </div>

            <PushRow />

            {user && (
              <div className="border-t border-line p-2">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className={cn(row, "justify-start gap-2.5 rounded-xl text-loss row-hover")}
                >
                  <LogOut size={16} />
                  {t("settings.logout")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
    </>
  );
}

/** Web push status with a switch-off action; hidden where the browser has no push support. */
function PushRow() {
  const { t } = useI18n();
  const { status, busy, disable } = usePush();
  if (status === "unsupported") return null;
  const on = status === "subscribed";

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
          {on ? <BellRing size={17} className="shrink-0 text-brand" /> : <BellOff size={17} className="shrink-0 text-ink-3" />}
          <span className="truncate">{t("push.settings")}</span>
        </span>
        {on ? (
          <button
            type="button"
            onClick={() => void disable()}
            disabled={busy}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-xs font-semibold text-ink-2 transition hover:bg-surface-3 hover:text-loss disabled:opacity-50"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            {t("push.disable")}
          </button>
        ) : (
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-3">{t("push.off")}</span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-3">
        {on && <span className="font-semibold text-win">{t("push.on")} · </span>}
        {status === "denied" ? t("push.blocked") : t("push.hint")}
      </p>
    </div>
  );
}
