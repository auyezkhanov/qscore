import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import type { PlayerMatchLogEntry } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { EmptyState } from "@/shared/ui/States";
import { ChartFooter, ChartTooltipFrame } from "./ChartParts";
import { CHART } from "./chartColors";

/** Cumulative goals across the season (card body; the card lives in `SeasonCharts`). */
export function GoalsTimeline({ log }: { log: PlayerMatchLogEntry[] }) {
  const { t, locale } = useI18n();
  const gradientId = `goals-${useId().replace(/:/g, "")}`;
  // Chronological: rounds are sometimes played out of order, and cumulativeGoals follows kick-off order,
  // so the x axis shows match dates rather than round numbers.
  const data = [...log]
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((e) => ({
      ...e,
      label: formatDate(e.kickoff, locale, { day: "numeric", month: "short" }),
    }));
  const total = data.at(-1)?.cumulativeGoals ?? 0;

  if (data.length < 2) return <EmptyState title={t("chart.notEnoughData")} className="h-[280px]" />;
  return (
    <>
      <div className="h-[240px] px-1 pb-2 pt-4 sm:px-3" role="img" aria-label={`${t("chart.goalsTimeline")}. ${t("chart.totalGoals", { n: total })}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART.brand} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: CHART.ink3, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.line }} minTickGap={8} />
            <YAxis allowDecimals={false} tick={{ fill: CHART.ink3, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<GoalsTooltip />} cursor={{ stroke: CHART.ink3, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="cumulativeGoals"
              stroke={CHART.brand}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: CHART.brand,
                stroke: CHART.surface,
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartFooter>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
          <span className="font-semibold">{t("chart.totalGoals", { n: total })}</span>
        </span>
      </ChartFooter>
    </>
  );
}

function GoalsTooltip({ active, payload }: TooltipProps<number, string>) {
  const { t } = useI18n();
  const entry = payload?.[0]?.payload as PlayerMatchLogEntry | undefined;
  if (!active || !entry) return null;
  return (
    <ChartTooltipFrame entry={entry}>
      <div className="mt-1 text-ink-2">
        {t("player.goals")}: <span className="font-bold text-ink tnum">{entry.goals}</span> · {t("chart.totalGoals", { n: entry.cumulativeGoals })}
      </div>
    </ChartTooltipFrame>
  );
}
