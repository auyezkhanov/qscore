import type { ReactNode } from "react";
import { ChevronDown, Hand, Repeat2, RotateCcw, Shield, SlidersHorizontal, Target, Users, type LucideIcon } from "lucide-react";
import { useTeams } from "@/shared/api/queries";
import type { Position } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { Segmented } from "@/shared/ui/Chip";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { POSITIONS, type TransferFilters as Filters, type TransferLeague } from "./useTransferFilters";

const POSITION_ICONS: Record<Position, LucideIcon> = { GK: Hand, DF: Shield, MF: Repeat2, FW: Target };

function FilterGroup({ label, id, className, children }: { label: string; id?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      {id ? (
        <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-ink-3">
          {label}
        </label>
      ) : (
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{label}</div>
      )}
      {children}
    </div>
  );
}

function TeamSelect({ league, value, onChange }: { league: TransferLeague; value?: string; onChange: (team: string | undefined) => void }) {
  const { t, locale } = useI18n();
  const teams = useTeams(league);
  const sorted = [...(teams.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, locale));
  const selected = sorted.find((team) => team.slug === value);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-3">
        {selected ? <TeamLogo team={selected} size="sm" /> : <Users size={17} />}
      </span>
      <select
        id="transfer-team"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={teams.isLoading}
        className="h-11 w-full cursor-pointer appearance-none truncate rounded-xl border border-line bg-surface-2 pl-10 pr-9 text-sm font-semibold text-ink transition-colors hover:border-ink-3/40 focus:border-brand disabled:cursor-wait disabled:opacity-60"
      >
        <option value="">{t("transfers.allTeams")}</option>
        {sorted.map((team) => (
          <option key={team.id} value={team.slug}>
            {team.name}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

function PositionTiles({ value, onChange }: { value?: Position; onChange: (p: Position | undefined) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
      {POSITIONS.map((p) => {
        const Icon = POSITION_ICONS[p];
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            title={t(`position.${p}`)}
            onClick={() => onChange(active ? undefined : p)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-semibold transition active:scale-95 lg:flex-row lg:justify-start lg:gap-2 lg:px-3",
              active ? "border-brand bg-brand/10 text-brand" : "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon size={17} className="shrink-0" />
            <span className="truncate lg:hidden">{t(`position.short.${p}`)}</span>
            <span className="hidden truncate lg:inline">{t(`position.${p}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Filter card: sticky sidebar on desktop, compact block above the list on mobile. */
export function TransferFilters({
  filters,
  isFiltered,
  onLeague,
  onTeam,
  onPosition,
  onReset,
  className,
}: {
  filters: Filters;
  isFiltered: boolean;
  onLeague: (league: TransferLeague) => void;
  onTeam: (team: string | undefined) => void;
  onPosition: (p: Position | undefined) => void;
  onReset: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <aside className={cn("card", className)} aria-label={t("transfers.filters")}>
      <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
          <SlidersHorizontal size={16} className="text-ink-3" />
          {t("transfers.filters")}
        </h2>
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="-mr-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-semibold text-brand transition-colors hover:bg-surface-2"
          >
            <RotateCcw size={13} />
            {t("transfers.reset")}
          </button>
        )}
      </header>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-1">
        <FilterGroup label={t("transfers.league")}>
          <Segmented
            value={filters.league}
            onChange={onLeague}
            className="w-full [&>button]:flex-1"
            options={[
              { value: "kpl", label: t("league.kpl") },
              { value: "birinshi-liga", label: t("league.birinshi-liga") },
            ]}
          />
        </FilterGroup>
        <FilterGroup label={t("transfers.team")} id="transfer-team">
          <TeamSelect league={filters.league} value={filters.team} onChange={onTeam} />
        </FilterGroup>
        <FilterGroup label={t("transfers.position")} className="sm:col-span-2 lg:col-span-1">
          <PositionTiles value={filters.position} onChange={onPosition} />
        </FilterGroup>
      </div>
    </aside>
  );
}
