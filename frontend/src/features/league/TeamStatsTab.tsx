import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronDown, Shield } from "lucide-react";
import type { TeamSeasonStats } from "@/shared/api/types";
import { useTeamStats } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { SkeletonRows } from "@/shared/ui/Skeleton";
import { EmptyState, QueryState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { formatDecimal } from "./leaderStats";

type ColKey = keyof Pick<
  TeamSeasonStats,
  | "played"
  | "goalsPerMatch"
  | "concededPerMatch"
  | "cleanSheets"
  | "possession"
  | "shotsPerMatch"
  | "shotsOnTargetPerMatch"
  | "xgFor"
  | "xgAgainst"
  | "passAccuracy"
  | "cornersPerMatch"
  | "yellowCards"
  | "redCards"
>;

/** `low` = fewer is better (ranked ascending by default). `digits` / `percent` drive formatting. */
const COLUMNS: { key: ColKey; better: "high" | "low"; digits: number; percent?: boolean }[] = [
  { key: "played", better: "high", digits: 0 },
  { key: "goalsPerMatch", better: "high", digits: 2 },
  { key: "concededPerMatch", better: "low", digits: 2 },
  { key: "cleanSheets", better: "high", digits: 0 },
  { key: "possession", better: "high", digits: 1, percent: true },
  { key: "shotsPerMatch", better: "high", digits: 1 },
  { key: "shotsOnTargetPerMatch", better: "high", digits: 1 },
  { key: "xgFor", better: "high", digits: 1 },
  { key: "xgAgainst", better: "low", digits: 1 },
  { key: "passAccuracy", better: "high", digits: 1, percent: true },
  { key: "cornersPerMatch", better: "high", digits: 1 },
  { key: "yellowCards", better: "low", digits: 0 },
  { key: "redCards", better: "low", digits: 0 },
];

type Sort = { key: ColKey; dir: "asc" | "desc" };

const bestFirst = (key: ColKey): Sort => ({ key, dir: COLUMNS.find((c) => c.key === key)?.better === "low" ? "asc" : "desc" });

/** Sorted copy; teams without the figure always go last. */
function sortRows(rows: TeamSeasonStats[], sort: Sort): TeamSeasonStats[] {
  return [...rows].sort((a, b) => {
    const x = a[sort.key];
    const y = b[sort.key];
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return sort.dir === "asc" ? x - y : y - x;
  });
}

/** Season team stats: sortable table on wide screens, a stat picker + ranked bars on phones. */
export function TeamStatsTab({ slug }: { slug: string }) {
  const { t } = useI18n();
  const query = useTeamStats(slug);
  const [sort, setSort] = useState<Sort>(() => bestFirst("goalsPerMatch"));
  return (
    <section className="card overflow-hidden">
      <QueryState query={query} loading={<SkeletonRows rows={10} rowClassName="h-10" />}>
        {(rows) =>
          rows.length === 0 ? <EmptyState icon={<Shield size={22} />} title={t("common.noData")} /> : <StatsBody rows={rows} sort={sort} onSort={setSort} />
        }
      </QueryState>
    </section>
  );
}

function StatsBody({ rows, sort, onSort }: { rows: TeamSeasonStats[]; sort: Sort; onSort: (s: Sort) => void }) {
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  return (
    <>
      <RankedList rows={sorted} sort={sort} onSort={onSort} />
      <SortableTable rows={sorted} sort={sort} onSort={onSort} />
    </>
  );
}

function useFormat() {
  const { locale } = useI18n();
  return (col: (typeof COLUMNS)[number], value: number | null) =>
    value == null ? "—" : `${formatDecimal(value, locale, col.digits)}${col.percent ? "%" : ""}`;
}

function SortableTable({ rows, sort, onSort }: { rows: TeamSeasonStats[]; sort: Sort; onSort: (s: Sort) => void }) {
  const { t } = useI18n();
  const format = useFormat();
  const th = "py-2.5 text-[11px] font-semibold uppercase tracking-wide";

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className={cn(th, "sticky left-0 z-10 w-[200px] bg-surface pl-4 text-left text-ink-3")}>{t("standings.team")}</th>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              const Arrow = sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  key={c.key}
                  className={cn(th, "px-1 text-center last:pr-3")}
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    title={t(`teamStats.${c.key}` as const)}
                    onClick={() => onSort(active ? { key: c.key, dir: sort.dir === "asc" ? "desc" : "asc" } : bestFirst(c.key))}
                    className={cn(
                      "inline-flex items-center gap-0.5 whitespace-nowrap rounded-md px-1.5 py-1 uppercase transition-colors hover:bg-surface-2",
                      active ? "text-ink" : "text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {t(`teamStats.${c.key}.short` as const)}
                    {active && <Arrow size={11} strokeWidth={2.75} aria-hidden />}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className="group border-b border-line/70 transition-colors last:border-0 hover:bg-surface-2">
              <td className="sticky left-0 z-10 bg-surface py-2 pl-4 pr-2 transition-colors group-hover:bg-surface-2">
                <Link to={`/team/${r.team.slug}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-ink-3 tnum">{i + 1}</span>
                  <TeamLogo team={r.team} size="sm" />
                  <span className="truncate font-medium">{r.team.name}</span>
                </Link>
              </td>
              {COLUMNS.map((c) => (
                <td
                  key={c.key}
                  className={cn("px-1 py-2 text-center tnum last:pr-3", sort.key === c.key ? "bg-brand/[0.06] font-bold text-ink" : "text-ink-2")}
                >
                  {format(c, r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankedList({ rows, sort, onSort }: { rows: TeamSeasonStats[]; sort: Sort; onSort: (s: Sort) => void }) {
  const { t } = useI18n();
  const format = useFormat();
  const col = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[0];
  const max = Math.max(0, ...rows.map((r) => r[col.key] ?? 0));

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t("teamStats.sortBy")}</span>
          <select
            value={sort.key}
            onChange={(e) => onSort(bestFirst(e.target.value as ColKey))}
            className="h-9 w-full cursor-pointer appearance-none truncate rounded-full bg-surface-2 pl-4 pr-9 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {t(`teamStats.${c.key}` as const)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
        </label>
        <button
          type="button"
          onClick={() => onSort({ key: sort.key, dir: sort.dir === "asc" ? "desc" : "asc" })}
          aria-label={t("teamStats.reverse")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition hover:text-ink active:scale-95"
        >
          {sort.dir === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>
      </div>
      <ol>
        {rows.map((r, i) => {
          const value = r[col.key];
          return (
            <li key={r.team.id} className="border-b border-line/70 last:border-0">
              <Link to={`/team/${r.team.slug}`} className="flex items-center gap-3 px-4 py-2.5 row-hover">
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-ink-3 tnum">{i + 1}</span>
                <TeamLogo team={r.team} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.team.name}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className={cn("block h-full rounded-full", i === 0 ? "bg-brand" : "bg-brand/45")}
                      style={{ width: `${max > 0 && value != null ? Math.max(4, (value / max) * 100) : 0}%` }}
                    />
                  </span>
                </span>
                <span className={cn("w-16 shrink-0 text-right text-[15px] tnum", i === 0 ? "font-extrabold" : "font-bold text-ink-2")}>
                  {format(col, value)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
