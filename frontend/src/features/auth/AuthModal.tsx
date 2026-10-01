import { useState, type FormEvent } from "react";
import { ApiError } from "@/shared/api/client";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useAuth } from "./AuthProvider";

export type AuthMode = "login" | "register";

const KNOWN_ERRORS = new Set(["EMAIL_TAKEN", "INVALID_CREDENTIALS", "INVALID_EMAIL", "PASSWORD_TOO_SHORT", "TOO_MANY_REQUESTS", "NETWORK_ERROR"]);

export function AuthModal({ initialMode, onClose }: { initialMode: AuthMode; onClose: () => void }) {
  const { login, register } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await (mode === "login" ? login : register)(email, password);
      onClose();
    } catch (err) {
      const code = err instanceof ApiError && KNOWN_ERRORS.has(err.code) ? err.code : null;
      setError(t(code ? (`auth.error.${code}` as TranslationKey) : "auth.error.generic"));
    } finally {
      setPending(false);
    }
  }

  const input =
    "h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm outline-none transition placeholder:text-ink-3 focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20";

  return (
    <Modal title={mode === "login" ? t("auth.login.title") : t("auth.register.title")} onClose={onClose} closeLabel={t("auth.close")}>
      <form onSubmit={submit} className="space-y-3.5" noValidate={false}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-2">{t("auth.email")}</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@example.com" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-2">{t("auth.password")}</span>
          <input
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
            placeholder={mode === "register" ? t("auth.passwordHint") : undefined}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-loss/10 px-3 py-2 text-sm font-medium text-loss">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1 h-11 w-full">
          {pending ? t("auth.submitting") : mode === "login" ? t("auth.submit.login") : t("auth.submit.register")}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setMode((m) => (m === "login" ? "register" : "login"));
        }}
        className="mt-4 w-full text-center text-sm font-medium text-ink-2 hover:text-brand"
      >
        {mode === "login" ? t("auth.switchToRegister") : t("auth.switchToLogin")}
      </button>
    </Modal>
  );
}
