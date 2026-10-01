import { BarChart3 } from "lucide-react";
import type { MatchDetail, MatchTeamStats } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { cn } from "@/shared/lib/utils";
import { EmptyState } from "@/shared/ui/States";
import { TeamLogo } from "@/shared/ui/TeamLogo";

// Home uses the brand colour, away a neutral ink: raw club colours are often too similar or too dark/light.
const HOME_FILL = "bg-brand";
const AWAY_FILL = "bg-ink-2";

type Row = { key: TranslationKey; home: number; away: number; format?: (n: number) => string };
type Group = { key: TranslationKey; rows: Row[] };

type OptionalStat = "keyPasses" | "crosses" | "shotsBlocked" | "shotsOnBar" | "freekicks" | "throwIns" | "passesToFinalThird" | "passesProgressive";

/** A row for an optional figure: only when both sides have it and it isn't 0–0. */
function optional(h: MatchTeamStats, a: MatchTeamStats, stat: OptionalStat): Row[] {
  const home = h[stat];
  const away = a[stat];
  if (home == null || away == null || (home === 0 && away === 0)) return [];
  return [{ key: `stats.${stat}`, home, away }];
}

function buildGroups(h: MatchTeamStats, a: MatchTeamStats): Group[] {
  const shots: Row[] = [];
  if (h.xg != null && a.xg != null) shots.push({ key: "stats.xg", home: h.xg, away: a.xg, format: (n) => n.toFixed(2) });
  shots.push(
    { key: "stats.shots", home: h.shots, away: a.shots },
    { key: "stats.shotsOnTarget", home: h.shotsOnTarget, away: a.shotsOnTarget },
    ...optional(h, a, "shotsBlocked"),
    ...optional(h, a, "shotsOnBar"),
  );

  const passing: Row[] = [];
  // The source reports 0/0 when passing data isn't collected; hide it rather than show a fake "0%".
  if (h.passes > 0 || a.passes > 0) passing.push({ key: "stats.passes", home: h.passes, away: a.passes });
  if (h.passAccuracy > 0 || a.passAccuracy > 0) passing.push({ key: "stats.passAccuracy", home: h.passAccuracy, away: a.passAccuracy, format: (n) => `${n}%` });
  passing.push(
    ...optional(h, a, "keyPasses"),
    ...optional(h, a, "crosses"),
    ...optional(h, a, "passesToFinalThird"),
    ...optional(h, a, "passesProgressive"),
  );

  const other: Row[] = [{ key: "stats.corners", home: h.corners, away: a.corners }, ...optional(h, a, "freekicks"), ...optional(h, a, "throwIns")];
  if (h.saves != null && a.saves != null) other.push({ key: "stats.saves", home: h.saves, away: a.saves });
  other.push(
    { key: "stats.fouls", home: h.fouls, away: a.fouls },
    { key: "stats.offsides", home: h.offsides, away: a.offsides },
    { key: "stats.yellowCards", home: h.yellowCards, away: a.yellowCards },
    { key: "stats.redCards", home: h.redCards, away: a.redCards },
  );

  return [
    { key: "stats.group.shots" as const, rows: shots },
    { key: "stats.group.passing" as const, rows: passing },
    { key: "stats.group.other" as const, rows: other },
  ].filter((g) => g.rows.length > 0);
}

export function MatchStats({ match }: { match: MatchDetail }) {
  const { t } = useI18n();
  const stats = match.stats;
  if (!stats) return <EmptyState icon={<BarChart3 size={22} />} title={t("stats.notYet")} />;

  const { home, away } = stats;
  const possessionTotal = home.possession + away.possession;
  const homePoss = possessionTotal > 0 ? Math.round((home.possession / possessionTotal) * 100) : 50;

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <TeamLogo team={match.homeTeam} size="sm" />
        <h3 className="text-center text-[13px] font-semibold text-ink-2">{t("stats.possession")}</h3>
        <TeamLogo team={match.awayTeam} size="sm" />
      </div>
      <div className="flex h-9 overflow-hidden rounded-full text-sm font-bold tnum" role="img" aria-label={`${t("stats.possession")}: ${homePoss}% – ${100 - homePoss}%`}>
        <div className={cn("flex items-center pl-3.5 text-brand-fg transition-[width] duration-500", HOME_FILL)} style={{ width: `${homePoss}%` }}>
          {homePoss}%
        </div>
        <div className={cn("ml-0.5 flex flex-1 items-center justify-end pr-3.5 text-surface", AWAY_FILL)}>{100 - homePoss}%</div>
      </div>

      {buildGroups(home, away).map((g) => (
        <section key={g.key} className="mt-7">
          <h3 className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-ink-3">
            <span aria-hidden className="h-px flex-1 bg-line" />
            {t(g.key)}
            <span aria-hidden className="h-px flex-1 bg-line" />
          </h3>
          <ul className="space-y-4">
            {g.rows.map((r) => (
              <StatRow key={r.key} label={t(r.key)} row={r} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function StatRow({ label, row }: { label: string; row: Row }) {
  const fmt = row.format ?? String;
  const max = Math.max(row.home, row.away);
  const homeLeads = row.home > row.away;
  const awayLeads = row.away > row.home;

  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <Value leads={homeLeads} fill={HOME_FILL} text="text-brand-fg">
          {fmt(row.home)}
        </Value>
        <span className="min-w-0 text-center text-[13px] font-medium text-ink-2">{label}</span>
        <Value leads={awayLeads} fill={AWAY_FILL} text="text-surface">
          {fmt(row.away)}
        </Value>
      </div>
      <div className="mt-1.5 flex gap-1" aria-hidden>
        <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-surface-3">
          <div className={cn("rounded-full transition-[width] duration-500", HOME_FILL, !homeLeads && "opacity-50")} style={{ width: `${max > 0 ? (row.home / max) * 100 : 0}%` }} />
        </div>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className={cn("rounded-full transition-[width] duration-500", AWAY_FILL, !awayLeads && "opacity-50")} style={{ width: `${max > 0 ? (row.away / max) * 100 : 0}%` }} />
        </div>
      </div>
    </li>
  );
}

function Value({ leads, fill, text, children }: { leads: boolean; fill: string; text: string; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-[2.75rem] shrink-0 items-center justify-center rounded-full px-2 text-sm tnum",
        leads ? cn(fill, text, "font-bold") : "font-semibold text-ink",
      )}
    >
      {children}
    </span>
  );
}
