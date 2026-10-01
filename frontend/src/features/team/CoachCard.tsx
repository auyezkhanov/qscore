import { UserRound } from "lucide-react";
import type { CoachRecord } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate, parseDayKey } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Card, CardHeader, SectionLabel } from "@/shared/ui/Card";
import { formatDecimal } from "@/features/league/leaderStats";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Current head coach's season record, plus win-rate bars when the club changed coach this season. */
export function CoachCard({ coaches }: { coaches: CoachRecord[] }) {
  const { t, locale } = useI18n();
  const coach = coaches.find((c) => c.current) ?? coaches[0];
  if (!coach) return null;
  const since = parseDayKey(coach.since);

  return (
    <Card>
      <CardHeader title={t("coach.title")} icon={<UserRound size={16} />} />
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-ink-2 ring-1 ring-line"
          >
            {initials(coach.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-snug">{coach.name}</p>
            {since && (
              <p className="text-xs text-ink-3">{t("coach.since", { date: formatDate(since, locale, { day: "numeric", month: "long", year: "numeric" }) })}</p>
            )}
          </div>
        </div>

        {coach.matches > 0 && (
          <>
            <RecordBar coach={coach} />
            <dl className="mt-3 grid grid-cols-3 gap-2">
              <Fact label={t("coach.matches")} value={String(coach.matches)} />
              <Fact label={t("coach.winRate")} value={coach.winRate != null ? `${coach.winRate}%` : "—"} />
              <Fact label={t("coach.ppm")} value={coach.pointsPerMatch != null ? formatDecimal(coach.pointsPerMatch, locale, 2) : "—"} />
            </dl>
          </>
        )}
      </div>

      {coaches.length > 1 && (
        <div className="border-t border-line pb-3">
          <SectionLabel>{t("coach.history")}</SectionLabel>
          <ul className="space-y-2.5 px-4 sm:px-5">
            {coaches.map((c) => (
              <li key={`${c.name}-${c.since}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <span className="flex min-w-0 items-center gap-1.5 text-[13px]">
                  <span className={cn("truncate", c.current ? "font-bold" : "font-medium text-ink-2")}>{c.name}</span>
                  {c.current && (
                    <span className="shrink-0 rounded-full bg-brand/10 px-1.5 text-[10px] font-bold uppercase text-brand">{t("coach.current")}</span>
                  )}
                </span>
                <span className="text-xs text-ink-3 tnum">
                  {c.wins}-{c.draws}-{c.losses}
                </span>
                <span className="col-span-2 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <span className={cn("block h-full rounded-full", c.current ? "bg-brand" : "bg-ink-3")} style={{ width: `${c.winRate ?? 0}%` }} />
                  </span>
                  <span className="w-9 text-right text-xs font-bold tnum">{c.winRate != null ? `${c.winRate}%` : "—"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** W / D / L split as one segmented bar with the counts underneath. */
function RecordBar({ coach }: { coach: CoachRecord }) {
  const { t } = useI18n();
  const parts = [
    { key: "W", n: coach.wins, bar: "bg-win", text: "text-win" },
    { key: "D", n: coach.draws, bar: "bg-draw", text: "text-ink-2" },
    { key: "L", n: coach.losses, bar: "bg-loss", text: "text-loss" },
  ] as const;
  const total = coach.wins + coach.draws + coach.losses || 1;
  return (
    <div className="mt-4">
      <div
        className="flex h-2 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={t("coach.recordLabel", { w: coach.wins, d: coach.draws, l: coach.losses })}
      >
        {parts.map((p) => p.n > 0 && <span key={p.key} className={p.bar} style={{ width: `${(p.n / total) * 100}%` }} />)}
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-semibold">
        {parts.map((p) => (
          <span key={p.key} className={cn("tnum", p.text)}>
            {t(`coach.${p.key}` as const, { n: p.n })}
          </span>
        ))}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse rounded-xl bg-surface-2 px-2 py-2 text-center">
      <dt className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className="text-lg font-extrabold leading-none tnum">{value}</dd>
    </div>
  );
}
