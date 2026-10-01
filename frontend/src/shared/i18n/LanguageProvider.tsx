import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "@/shared/api/types";
import { ru, type TranslationKey } from "./ru";
import { en } from "./en";

export type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunction;
  /** BCP-47 locale for Intl formatters. */
  locale: string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "qscore:lang";
const dictionaries: Record<Lang, Record<TranslationKey, string>> = { ru, en };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ru" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "ru";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback<TFunction>(
    (key, vars) => {
      const template = dictionaries[lang][key] ?? ru[key] ?? key;
      return vars ? template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : template;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang: setLangState, t, locale: lang === "ru" ? "ru-RU" : "en-GB" }),
    [lang, t],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
