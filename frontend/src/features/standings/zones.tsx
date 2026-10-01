import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";

/** Table zones (title, Europe, promotion, relegation) shared by every league table. */
export const ZONES: Record<string, { color: string; label: TranslationKey }> = {
  champion: { color: "#17a2b0", label: "zone.champion" },
  euro_cups: { color: "#3b82f6", label: "zone.euro_cups" },
  promotion: { color: "#16a34a", label: "zone.promotion" },
  promotion_playoff: { color: "#84cc16", label: "zone.promotion_playoff" },
  relegation_playoff: { color: "#f59e0b", label: "zone.relegation_playoff" },
  relegation: { color: "#ef4444", label: "zone.relegation" },
};

/** Known zones present in a table, in row order (for the legend). */
export function zonesIn(rows: { zone?: string | null }[]): string[] {
  return [...new Set(rows.map((r) => r.zone).filter((z): z is string => !!z && z in ZONES))];
}

export function ZoneLegend({ zones }: { zones: string[] }) {
  const { t } = useI18n();
  if (zones.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-xs text-ink-2">
      {zones.map((z) => (
        <span key={z} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ZONES[z].color }} />
          {t(ZONES[z].label)}
        </span>
      ))}
    </div>
  );
}
