import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { Radar as RadarIcon } from "lucide-react";
import type { ComparisonMetrics, PlayerStats, Position } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { Card, CardHeader } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/States";
import { CHART } from "./chartColors";

type Metric = { key: TranslationKey; value: (m: ComparisonMetrics) => number; inverted?: boolean };

const METRICS: Metric[] = [
  { key: "chart.metric.goals", value: (m) => m.goals },
  { key: "chart.metric.assists", value: (m) => m.assists },
  { key: "chart.metric.appearances", value: (m) => m.appearances },
  { key: "chart.metric.minutes", value: (m) => m.minutesPlayed },
  // Fewer card points is better, so the scale is flipped.
  { key: "chart.metric.discipline", value: (m) => m.cardPoints, inverted: true },
];

function percent(value: number, max: number, inverted = false): number {
  if (max <= 0) return inverted ? 100 : 0;
  const share = Math.min(1, Math.max(0, value / max));
  return Math.round((inverted ? 1 - share : share) * 100);
}

/** Player vs the league average for the same position, each metric as % of the position's best. */
export function ComparisonRadar({ comparison, position }: { comparison: PlayerStats["positionComparison"]; position: Position }) {
  const { t } = useI18n();
  const title = t("chart.comparison", { position: t(`position.${position}`).toLowerCase() });
  const data = METRICS.map((m) => {
    const max = m.value(comparison.max);
    return {
      metric: t(m.key),
      player: percent(m.value(comparison.player), max, m.inverted),
      average: percent(m.value(comparison.average), max, m.inverted),
    };
  });

  return (
    <Card>
      <CardHeader title={title} icon={<RadarIcon size={16} />} />
      {comparison.sampleSize <= 1 ? (
        <EmptyState title={t("chart.notEnoughData")} className="h-[240px]" />
      ) : (
        <>
          <div
            className="h-[240px] px-1"
            role="img"
            aria-label={`${title}: ${data.map((d) => `${d.metric} ${d.player}% / ${d.average}%`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                <PolarGrid stroke={CHART.line} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: CHART.ink2, fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="average" stroke={CHART.ink3} strokeDasharray="4 3" fill={CHART.ink3} fillOpacity={0.12} isAnimationActive={false} />
                <Radar dataKey="player" stroke={CHART.brand} strokeWidth={2} fill={CHART.brand} fillOpacity={0.3} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-5 border-t border-line px-4 py-2.5 text-xs text-ink-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              {t("chart.player")}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0 w-4 border-t-2 border-dashed border-ink-3" />
              {t("chart.average")}
            </span>
            <span className="text-ink-3 tnum">n = {comparison.sampleSize}</span>
          </div>
        </>
      )}
    </Card>
  );
}
