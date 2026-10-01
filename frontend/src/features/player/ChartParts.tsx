import type { ReactNode } from "react";
import type { PlayerMatchLogEntry } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";

/** Legend / summary strip under a chart. */
export function ChartFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[41px] flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-ink-2">
      {children}
    </div>
  );
}

/** Tooltip shell for per-match charts: round · date, opponent and score, then chart-specific lines. */
export function ChartTooltipFrame({ entry, children }: { entry: PlayerMatchLogEntry; children: ReactNode }) {
  const { t, locale } = useI18n();
  const score = entry.homeScore != null && entry.awayScore != null ? `${entry.homeScore}:${entry.awayScore}` : "–";
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <div className="font-semibold text-ink-3">
        {t("chart.round", { n: entry.round })} · {formatDate(entry.kickoff, locale, { day: "numeric", month: "long" })}
      </div>
      <div className="mt-0.5 font-semibold text-ink">
        {entry.isHome ? t("chart.vsHome", { team: entry.opponent.name }) : t("chart.vsAway", { team: entry.opponent.name })} ·{" "}
        <span className="tnum">{score}</span>
      </div>
      {children}
    </div>
  );
}
