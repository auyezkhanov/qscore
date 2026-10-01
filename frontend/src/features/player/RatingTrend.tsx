import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import type { PlayerMatchLogEntry } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { RatingBadge } from "@/shared/ui/RatingBadge";
import { EmptyState } from "@/shared/ui/States";
import { ChartFooter, ChartTooltipFrame } from "./ChartParts";
import { CHART, ratingColor } from "./chartColors";

type Point = PlayerMatchLogEntry & { rating: number; label: string };
type DotProps = { cx?: number; cy?: number; index?: number; payload?: Point };

// One sample per FotMob band, for the legend.
const BANDS = [9, 8, 7, 6, 5, 4] as const;

const dot =
  (r: number) =>
  ({ cx, cy, index, payload }: DotProps) =>
    cx == null || cy == null || !payload ? (
      <g key={`dot-${index}`} />
    ) : (
      <circle key={`dot-${index}`} cx={cx} cy={cy} r={r} fill={ratingColor(payload.rating)} stroke={CHART.surface} strokeWidth={2} />
    );

/** Rating per match over the season, dots coloured by rating band, dashed line at the season average. */
export function RatingTrend({ log, average }: { log: PlayerMatchLogEntry[]; average: number | null }) {
  const { t, locale } = useI18n();
  const data: Point[] = log
    .flatMap((e) =>
      e.rating == null
        ? []
        : [
            {
              ...e,
              rating: e.rating,
              label: formatDate(e.kickoff, locale, {
                day: "numeric",
                month: "short",
              }),
            },
          ],
    )
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  if (data.length < 2) return <EmptyState title={t("chart.notEnoughData")} className="h-[280px]" />;

  const ratings = data.map((d) => d.rating);
  const avg = average ?? ratings.reduce((s, r) => s + r, 0) / ratings.length;
  const lo = Math.max(3, Math.floor(Math.min(...ratings) - 0.3));
  const hi = Math.min(10, Math.ceil(Math.max(...ratings) + 0.3));
  const avgLabel = t("chart.seasonAverage", { n: avg.toFixed(2) });

  return (
    <>
      <div className="h-[240px] px-1 pb-2 pt-4 sm:px-3" role="img" aria-label={`${t("chart.ratingTrend")}. ${avgLabel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={CHART.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: CHART.ink3, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.line }} minTickGap={8} />
            <YAxis
              domain={[lo, hi]}
              allowDecimals={false}
              tickCount={hi - lo + 1}
              tick={{ fill: CHART.ink3, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ReferenceLine y={avg} stroke={CHART.ink2} strokeDasharray="5 4" strokeOpacity={0.7} ifOverflow="extendDomain" />
            <Tooltip content={<RatingTooltip />} cursor={{ stroke: CHART.ink3, strokeDasharray: "3 3" }} />
            <Line
              type="linear"
              dataKey="rating"
              stroke={CHART.ink3}
              strokeOpacity={0.55}
              strokeWidth={2}
              dot={dot(4)}
              activeDot={dot(6.5)}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartFooter>
        <span className="inline-flex items-center gap-1" aria-hidden>
          {BANDS.map((b) => (
            <span key={b} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ratingColor(b) }} />
          ))}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0 w-4 border-t-2 border-dashed border-ink-2/70" />
          <span className="font-semibold tnum">{avgLabel}</span>
        </span>
      </ChartFooter>
    </>
  );
}

function RatingTooltip({ active, payload }: TooltipProps<number, string>) {
  const { t } = useI18n();
  const entry = payload?.[0]?.payload as Point | undefined;
  if (!active || !entry) return null;
  return (
    <ChartTooltipFrame entry={entry}>
      <div className="mt-1.5 flex items-center gap-2 text-ink-2">
        <RatingBadge rating={entry.rating} size="sm" />
        <span className="tnum">{t("common.minutesShort", { n: entry.minutes })}</span>
      </div>
    </ChartTooltipFrame>
  );
}
