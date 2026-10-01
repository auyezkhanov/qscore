import type { MatchSummary } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatTime } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

export { isLive } from "@/shared/lib/match";
export const hasScore = (m: Pick<MatchSummary, "homeScore" | "awayScore">) => m.homeScore != null && m.awayScore != null;

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-1.5 w-1.5 shrink-0", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
    </span>
  );
}

/**
 * Compact status for list rows: kick-off time, live minute, HT/FT, etc.
 * `variant="long"` gives the spelled-out label used in match headers.
 */
export function MatchStatusLabel({ match, variant = "short", className }: { match: MatchSummary; variant?: "short" | "long"; className?: string }) {
  const { t, locale } = useI18n();
  const long = variant === "long";

  switch (match.status) {
    case "LIVE":
      return (
        <span className={cn("inline-flex items-center gap-1.5 font-bold text-live tnum", className)}>
          <LiveDot />
          {match.minute != null ? `${match.minute}′` : t("match.live")}
        </span>
      );
    case "HALFTIME":
      return (
        <span className={cn("inline-flex items-center gap-1.5 font-bold text-live", className)}>
          <LiveDot />
          {long ? t("match.halftime") : t("match.halftimeShort")}
        </span>
      );
    case "FINISHED":
      return <span className={cn("font-semibold text-ink-3", className)}>{long ? t("match.finished") : t("match.finishedShort")}</span>;
    case "POSTPONED":
      return <span className={cn("font-semibold text-amber-600 dark:text-amber-400", className)}>{t("match.postponed")}</span>;
    case "CANCELLED":
      return <span className={cn("font-semibold text-ink-3 line-through", className)}>{t("match.cancelled")}</span>;
    default:
      return (
        <span className={cn("font-semibold text-ink-2 tnum", className)}>
          {match.timeTbd ? (long ? t("date.tbd") : "—:—") : formatTime(match.kickoff, locale)}
        </span>
      );
  }
}
