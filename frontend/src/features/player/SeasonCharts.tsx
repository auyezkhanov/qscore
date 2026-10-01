import { useState } from "react";
import { Star, TrendingUp } from "lucide-react";
import type { PlayerMatchLogEntry } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Segmented } from "@/shared/ui/Chip";
import { GoalsTimeline } from "./GoalsChart";
import { RatingTrend } from "./RatingTrend";

type View = "goals" | "rating";

/** Views the card can show for this player (empty: render nothing). */
export function seasonChartViews(log: PlayerMatchLogEntry[], isGk: boolean): View[] {
  const views: View[] = [];
  if (!isGk) views.push("goals");
  if (log.some((e) => e.rating != null)) views.push("rating");
  return views;
}

/**
 * Season-over-time card: cumulative goals and per-match rating behind a "Goals / Rating" switch.
 * Goalkeepers only get the rating view; the card is omitted when there's nothing to draw.
 */
export function SeasonCharts({ log, isGk, average }: { log: PlayerMatchLogEntry[]; isGk: boolean; average: number | null }) {
  const { t } = useI18n();
  const views = seasonChartViews(log, isGk);
  const [view, setView] = useState<View>(views[0] ?? "goals");

  if (views.length === 0) return null;
  const active = views.includes(view) ? view : views[0];

  return (
    <Card>
      <CardHeader
        title={active === "goals" ? t("chart.goalsTimeline") : t("chart.ratingTrend")}
        icon={active === "goals" ? <TrendingUp size={16} /> : <Star size={16} />}
        action={
          views.length > 1 && (
            <Segmented
              size="sm"
              value={active}
              onChange={setView}
              options={[
                { value: "goals", label: t("chart.tab.goals") },
                { value: "rating", label: t("chart.tab.rating") },
              ]}
            />
          )
        }
      />
      {active === "goals" ? <GoalsTimeline log={log} /> : <RatingTrend log={log} average={average} />}
    </Card>
  );
}
