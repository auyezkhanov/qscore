import { Link } from "react-router-dom";
import type { SquadPlayer } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn, flagEmoji, formatMoney } from "@/shared/lib/utils";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { SectionLabel } from "@/shared/ui/Card";

const COLS =
  "grid grid-cols-[24px_minmax(0,1fr)_30px_30px_30px] items-center gap-x-2 sm:grid-cols-[28px_minmax(0,1fr)_minmax(0,150px)_44px_76px_44px_44px_44px] sm:gap-x-3";

/** One position group of a squad: number, photo, name, nationality, age and season stats. */
export function SquadList({ title, players }: { title: string; players: SquadPlayer[] }) {
  const { t, locale } = useI18n();
  const th = "text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3";

  return (
    <section className="border-b border-line pb-1 last:border-0">
      <div className={cn(COLS, "px-4 pb-1.5 sm:px-5")}>
        <SectionLabel className="col-span-2 px-0 pb-0 sm:px-0">{title}</SectionLabel>
        <span className={cn(th, "hidden pt-4 text-left sm:block")}>{t("player.nationality")}</span>
        <span className={cn(th, "hidden pt-4 sm:block")} title={t("player.age")}>
          {t("team.ageShort")}
        </span>
        <span className={cn(th, "hidden pt-4 text-right sm:block")}>{t("value.market")}</span>
        <span className={cn(th, "pt-4")} title={t("player.appearances")}>
          {t("career.apps")}
        </span>
        <span className={cn(th, "pt-4")} title={t("player.goals")}>
          {t("career.goals")}
        </span>
        <span className={cn(th, "pt-4")} title={t("player.assists")}>
          {t("career.assists")}
        </span>
      </div>
      <ul>
        {players.map((p) => {
          const flag = flagEmoji(p.nationalityCode);
          return (
            <li key={p.id}>
              <Link to={`/player/${p.slug}`} className={cn(COLS, "px-4 py-2 row-hover sm:px-5")}>
                <span className="text-center text-[13px] font-semibold text-ink-3 tnum">{p.number ?? "–"}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} number={p.number} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-ink-3 sm:hidden">
                      {[
                        p.nationality && `${flag} ${p.nationality}`.trim(),
                        p.age != null && `${t("player.age")}: ${p.age}`,
                        p.marketValue != null && formatMoney(p.marketValue, locale),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="hidden min-w-0 items-center gap-1.5 text-[13px] text-ink-2 sm:flex">
                  {flag && <span aria-hidden>{flag}</span>}
                  <span className="truncate">{p.nationality ?? "—"}</span>
                </span>
                <span className="hidden text-center text-[13px] text-ink-2 tnum sm:block">{p.age ?? "—"}</span>
                <span className="hidden truncate text-right text-[13px] font-semibold tnum sm:block">
                  {p.marketValue != null ? formatMoney(p.marketValue, locale) : <span className="font-normal text-ink-3">—</span>}
                </span>
                <Stat value={p.appearances} />
                <Stat value={p.goals} strong />
                <Stat value={p.assists} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stat({ value, strong = false }: { value: number; strong?: boolean }) {
  return <span className={cn("text-center text-[13px] tnum", value === 0 ? "text-ink-3" : strong ? "font-bold text-ink" : "text-ink-2")}>{value}</span>;
}
