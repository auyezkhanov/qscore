import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useSeasons } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";

/**
 * Archived season in `?season=`; null means the current season (today's behaviour).
 * The setter drops `?round=` because round numbers don't carry across seasons.
 */
export function useSeasonParam(currentYear: number | null): [number | null, (year: number) => void] {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get("season"));
  const archived = Number.isInteger(raw) && raw > 1900 && raw !== currentYear ? raw : null;
  const setSeason = useCallback(
    (year: number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (year === currentYear) next.delete("season");
          else next.set("season", String(year));
          next.delete("round");
          return next;
        },
        { replace: true },
      ),
    [setParams, currentYear],
  );
  return [archived, setSeason];
}

const pill = "inline-flex h-8 shrink-0 items-center rounded-full bg-surface-2 text-[13px] font-semibold text-ink";

/** FotMob-style "Season 2026 ▾" pill; a static label until (or unless) older seasons are known. */
export function SeasonPicker({ slug, value, onChange }: { slug: string; value: number | null; onChange: (year: number) => void }) {
  const { t } = useI18n();
  const seasons = useSeasons(slug).data ?? [];
  const label = (year: number) => t("league.season", { year });

  if (seasons.length < 2) return value != null ? <span className={`${pill} px-3`}>{label(value)}</span> : null;

  const current = seasons.find((s) => s.current)?.year ?? seasons[0].year;
  const selected = value ?? current;
  return (
    <label className="relative">
      <span className="sr-only">{t("league.seasonSelect")}</span>
      <select
        value={selected}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${pill} cursor-pointer appearance-none pl-3 pr-8 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60`}
      >
        {seasons.map((s) => (
          <option key={s.year} value={s.year}>
            {label(s.year)}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
    </label>
  );
}
