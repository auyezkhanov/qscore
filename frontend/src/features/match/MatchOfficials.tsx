import { Flag } from "lucide-react";
import type { Official } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";

const ROLES: Record<string, TranslationKey> = {
  main: "official.main",
  first_assistant: "official.first_assistant",
  second_assistant: "official.second_assistant",
  fourth_referee: "official.fourth_referee",
  var_main: "official.var_main",
  var_assistant: "official.var_assistant",
};
const ORDER = Object.keys(ROLES);
const rank = (role: string) => (ORDER.includes(role) ? ORDER.indexOf(role) : ORDER.length);

/** Referee team block for the lineups tab; nothing when the officials aren't known. */
export function MatchOfficials({ officials }: { officials: Official[] }) {
  const { t } = useI18n();
  if (officials.length === 0) return null;
  const sorted = [...officials].sort((a, b) => rank(a.role) - rank(b.role));

  return (
    <section className="border-t border-line pb-3">
      <h3 className="flex items-center gap-2 px-4 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-3 sm:px-5">
        <Flag size={13} aria-hidden />
        {t("officials.title")}
      </h3>
      <dl className="grid grid-cols-1 gap-x-6 px-4 sm:grid-cols-2 sm:px-5">
        {sorted.map((o) => (
          <div key={`${o.role}:${o.name}`} className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2 text-sm last:border-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-0">
            <dt className="shrink-0 text-xs text-ink-3">{ROLES[o.role] ? t(ROLES[o.role]) : o.role}</dt>
            <dd className="min-w-0 truncate text-right font-medium">{o.name}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
