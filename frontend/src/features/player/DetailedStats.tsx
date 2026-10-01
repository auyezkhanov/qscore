import { BarChart3 } from "lucide-react";
import type { PlayerAdvancedStats, PlayerDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { formatNumber } from "@/shared/lib/utils";
import { Card, CardHeader, SectionLabel } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/States";

type Format = "int" | "pct" | "per90" | "dec";
type Item = { label: TranslationKey; value: (p: PlayerDetail, a: PlayerAdvancedStats) => number | null | undefined; format?: Format };
type Block = { title: TranslationKey; items: Item[] };

// Row builders: `stat` for values derived from the player, `a` for a raw advanced stat.
const stat = (label: TranslationKey, value: Item["value"], format: Format = "int"): Item => ({ label, value, format });
const a = (label: TranslationKey, key: keyof PlayerAdvancedStats, format: Format = "int") => stat(label, (_p, adv) => adv[key], format);

const GOALKEEPING: Block = {
  title: "block.goalkeeping",
  items: [
    a("stat.saves", "saves"),
    a("stat.saveRatio", "saveRatio", "pct"),
    a("stat.cleanSheets", "cleanSheets"),
    a("stat.goalsConceded", "goalsConceded"),
    a("stat.goalsConcededPenalty", "goalsConcededPenalty"),
    a("stat.penaltySaves", "penaltySaves"),
    a("stat.exits", "exits"),
    a("stat.exitsSuccess", "exitsSuccess"),
  ],
};

const OUTFIELD: Block[] = [
  {
    title: "block.attack",
    items: [
      stat("stat.goals", (p) => p.season.goals),
      stat("stat.assists", (p) => p.season.assists),
      stat("stat.goalsAssists", (p) => p.season.goals + p.season.assists),
      a("stat.xg", "xg", "dec"),
      a("stat.xgPer90", "xgPer90", "per90"),
      a("stat.penaltyGoals", "penaltyGoals"),
      a("stat.goalsOutOfBox", "goalsOutOfBox"),
      a("stat.dribbles", "dribbles"),
      a("stat.dribblesSuccess", "dribblesSuccess"),
      a("stat.dribblesPer90", "dribblesPer90", "per90"),
      a("stat.offsides", "offsides"),
    ],
  },
  {
    title: "block.shooting",
    items: [a("stat.shots", "shots"), a("stat.shotsOnTarget", "shotsOnTarget"), a("stat.shotsBlocked", "shotsBlocked")],
  },
  {
    title: "block.passing",
    items: [
      a("stat.passes", "passes"),
      a("stat.passesAccurate", "passesAccurate"),
      a("stat.passAccuracy", "passAccuracy", "pct"),
      a("stat.keyPasses", "keyPasses"),
      a("stat.passesForward", "passesForward"),
      a("stat.passesProgressive", "passesProgressive"),
      a("stat.passesToFinalThird", "passesToFinalThird"),
      a("stat.passesToBox", "passesToBox"),
      a("stat.crosses", "crosses"),
      a("stat.crossesAccurate", "crossesAccurate"),
      a("stat.corners", "corners"),
    ],
  },
  {
    title: "block.defending",
    items: [
      a("stat.tackles", "tackles"),
      a("stat.tacklesPer90", "tacklesPer90", "per90"),
      a("stat.interceptions", "interceptions"),
      a("stat.recoveries", "recoveries"),
      a("stat.duels", "duels"),
      a("stat.duelsWon", "duelsWon"),
      a("stat.groundDuels", "groundDuels"),
      a("stat.groundDuelsWon", "groundDuelsWon"),
      a("stat.aerialDuels", "aerialDuels"),
      a("stat.aerialDuelsWon", "aerialDuelsWon"),
      a("stat.ownGoals", "ownGoals"),
    ],
  },
];

const DISCIPLINE: Block = {
  title: "block.discipline",
  items: [
    stat("stat.yellow", (p) => p.season.yellowCards),
    a("stat.secondYellow", "secondYellowCards"),
    stat("stat.red", (p) => p.season.redCards),
    a("stat.fouls", "fouls"),
    a("stat.foulsSuffered", "foulsSuffered"),
  ],
};

function format(value: number, fmt: Format, locale: string): string {
  switch (fmt) {
    case "pct":
      return `${formatNumber(Math.round(value), locale)}%`;
    case "per90":
      return value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    case "dec":
      return value.toLocaleString(locale, { maximumFractionDigits: 2 });
    default:
      return formatNumber(value, locale);
  }
}

/** Advanced season stats grouped into blocks; rows without a value are skipped. */
export function DetailedStats({ player }: { player: PlayerDetail }) {
  const { t, locale } = useI18n();
  const stats = player.advancedStats ?? {};
  const blocks = [...(player.position === "GK" ? [GOALKEEPING] : OUTFIELD), DISCIPLINE]
    .map((b) => ({
      title: b.title,
      rows: b.items.flatMap((i) => {
        const v = i.value(player, stats);
        return v == null ? [] : [{ label: i.label, value: v, format: i.format ?? "int" }];
      }),
    }))
    .filter((b) => b.rows.length > 0);

  return (
    <Card>
      <CardHeader title={t("player.detailedStats")} icon={<BarChart3 size={16} />} />
      {blocks.length === 0 ? (
        <EmptyState title={t("common.noData")} className="py-8" />
      ) : (
        <div className="pb-2 sm:columns-2 sm:gap-0 lg:columns-1">
          {blocks.map((b) => (
            <section key={b.title} className="break-inside-avoid">
              <SectionLabel>{t(b.title)}</SectionLabel>
              <dl>
                {b.rows.map((r) => (
                  <div key={r.label} className="px-4 py-1.5 sm:px-5">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <dt className="min-w-0 text-ink-2">{t(r.label)}</dt>
                      <dd className="shrink-0 font-bold tnum">{format(r.value, r.format, locale)}</dd>
                    </div>
                    {r.format === "pct" && (
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, r.value))}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
