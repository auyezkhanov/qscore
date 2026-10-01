import { ArrowLeftRight, BarChart3, Database, ExternalLink, Newspaper, Radio, Shirt, Table2, type LucideIcon } from "lucide-react";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { CardHeader } from "@/shared/ui/Card";
import { Page } from "@/shared/ui/Container";

const FEATURES: { key: TranslationKey; icon: LucideIcon }[] = [
  { key: "about.f.live", icon: Radio },
  { key: "about.f.tables", icon: Table2 },
  { key: "about.f.lineups", icon: Shirt },
  { key: "about.f.stats", icon: BarChart3 },
  { key: "about.f.transfers", icon: ArrowLeftRight },
  { key: "about.f.news", icon: Newspaper },
];

export default function AboutPage() {
  const { t } = useI18n();
  useDocumentTitle(t("about.title"));

  return (
    <Page>
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="relative isolate overflow-hidden rounded-card bg-gradient-to-br from-brand-600 via-brand-700 to-brand-950 px-5 py-10 text-white shadow-card sm:px-10 sm:py-14">
          <div aria-hidden className="absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="absolute -bottom-24 -left-10 -z-10 h-56 w-56 rounded-full bg-brand-300/20 blur-3xl" />
          <h1 className="flex items-center gap-1.5">
            <img src="/q-icon.png" alt="" width={64} height={64} className="h-14 w-14 drop-shadow-lg sm:h-16 sm:w-16" />
            <span className="text-4xl font-extrabold italic tracking-tight sm:text-5xl">score</span>
            <span className="sr-only">Qscore — {t("about.title")}</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg font-semibold leading-snug text-white/90 [text-wrap:balance] sm:text-xl">{t("about.subtitle")}</p>
        </section>

        <section className="card space-y-4 p-5 text-[15px] leading-7 text-ink-2 sm:p-8 sm:text-base">
          <p>{t("about.p1")}</p>
          <p>{t("about.p2")}</p>
          <p>{t("about.p3")}</p>
        </section>

        <section className="card overflow-hidden">
          <CardHeader title={t("about.features")} />
          <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon size={20} />
                </span>
                <span className="text-sm font-semibold">{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>

        <a
          href="https://kffleague.kz"
          target="_blank"
          rel="noopener noreferrer"
          className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-pop sm:p-5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-ink-2">
            <Database size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold uppercase tracking-wider text-ink-3">{t("about.source")}</span>
            <span className="block truncate text-base font-bold group-hover:text-brand">kffleague.kz</span>
            <span className="block text-sm text-ink-3">{t("about.sourceText")}</span>
          </span>
          <ExternalLink size={18} className="shrink-0 text-ink-3 transition-colors group-hover:text-brand" />
        </a>
      </div>
    </Page>
  );
}
