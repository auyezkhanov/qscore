import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";

/** Colour per points band: exact score / result + goal difference / result / miss. */
export const POINTS_TONE: Record<number, string> = {
  3: "bg-win text-white",
  2: "bg-brand text-brand-fg",
  1: "bg-amber-500 text-white dark:bg-amber-400 dark:text-black",
  0: "bg-surface-3 text-ink-3",
};

export function PointsBadge({ points, size = "md", className }: { points: number; size?: "sm" | "md"; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      title={t("predictor.pointsAria", { n: points })}
      aria-label={t("predictor.pointsAria", { n: points })}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-extrabold tnum leading-none shadow-sm",
        size === "md" ? "h-8 min-w-[2.5rem] px-2 text-sm" : "h-6 min-w-[1.75rem] px-1.5 text-xs",
        POINTS_TONE[points] ?? POINTS_TONE[0],
        className,
      )}
    >
      {points > 0 ? `+${points}` : "0"}
    </span>
  );
}
