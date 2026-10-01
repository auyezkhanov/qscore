import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { Banknote } from "lucide-react";
import { useMarketValueHistory } from "@/shared/api/queries";
import type { MarketValueHistory, PlayerDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/utils";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Skeleton } from "@/shared/ui/Skeleton";
import { CHART } from "./chartColors";

type Point = MarketValueHistory["points"][number] & { t: number };

/** Transfermarkt dates are calendar days ("YYYY-MM-DD"): read them as local midnight, not UTC. */
const toDate = (d: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);

/**
 * Transfermarkt market value over time. The request is slow and may fail, so the card shows a
 * skeleton while loading and disappears entirely on error or when there's no history.
 */
export function MarketValueCard({ player }: { player: PlayerDetail }) {
  const { t, locale } = useI18n();
  const query = useMarketValueHistory(player.slug, player.marketValue != null || player.transfermarktUrl != null);
  const gradientId = `mv-${useId().replace(/:/g, "")}`;

  if (query.isPending && query.fetchStatus !== "idle") {
    return (
      <Card>
        <CardHeader title={t("mv.title")} icon={<Banknote size={16} />} />
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-[160px] w-full" />
        </div>
      </Card>
    );
  }
  const history = query.data;
  if (!history || history.points.length === 0) return null;

  const data: Point[] = history.points.map((p) => ({ ...p, t: toDate(p.date).getTime() })).sort((a, b) => a.t - b.t);
  const current = history.current ?? player.marketValue ?? data.at(-1)?.value ?? null;
  const highest = history.highest ?? data.reduce<Point | null>((best, p) => (best && best.value >= p.value ? best : p), null);
  const money = (v: number) => formatMoney(v, locale);
  const year = (ms: number) => String(new Date(ms).getFullYear());

  return (
    <Card>
      <CardHeader title={t("mv.title")} icon={<Banknote size={16} />} />
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-4 pt-3 sm:px-5">
        {current != null && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t("mv.current")}</div>
            <div className="text-2xl font-extrabold leading-tight tracking-tight text-brand tnum">{money(current)}</div>
          </div>
        )}
        {highest && (
          <div className="text-right text-xs text-ink-3">
            {t("mv.highest")}: <span className="font-bold text-ink tnum">{money(highest.value)}</span>
            <span className="block tnum">
              {formatDate(toDate(highest.date), locale, {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
      {data.length > 1 && (
        <div className="h-[180px] px-1 pb-1 pt-3 sm:px-2" role="img" aria-label={`${t("mv.title")}: ${current != null ? money(current) : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={CHART.brand} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.line} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={year}
                tick={{ fill: CHART.ink3, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART.line }}
                minTickGap={24}
              />
              <YAxis tickFormatter={money} tick={{ fill: CHART.ink3, fontSize: 11 }} tickLine={false} axisLine={false} width={68} tickCount={4} />
              <Tooltip content={<ValueTooltip />} cursor={{ stroke: CHART.ink3, strokeDasharray: "3 3" }} />
              <Area
                type="stepAfter"
                dataKey="value"
                stroke={CHART.brand}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4.5,
                  fill: CHART.brand,
                  stroke: CHART.surface,
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="border-t border-line px-4 py-2.5 text-right text-[11px] text-ink-3 sm:px-5">
        {player.transfermarktUrl ? (
          <a href={player.transfermarktUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand hover:underline">
            {t("mv.source")}
          </a>
        ) : (
          t("mv.source")
        )}
      </p>
    </Card>
  );
}

function ValueTooltip({ active, payload }: TooltipProps<number, string>) {
  const { locale } = useI18n();
  const p = payload?.[0]?.payload as Point | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <div className="font-semibold text-ink-3 tnum">
        {formatDate(toDate(p.date), locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
      <div className="mt-0.5 text-sm font-extrabold text-ink tnum">{formatMoney(p.value, locale)}</div>
      {p.club && <div className="mt-0.5 text-ink-2">{p.club}</div>}
    </div>
  );
}
