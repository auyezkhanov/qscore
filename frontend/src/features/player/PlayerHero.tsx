import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileSignature, Footprints, Ruler, Shirt, UserRound, Weight } from "lucide-react";
import type { PlayerCareer, PlayerDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { formatDate } from "@/shared/lib/date";
import { cn, flagEmoji, formatMoney } from "@/shared/lib/utils";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { Skeleton } from "@/shared/ui/Skeleton";
import { TeamLogo } from "@/shared/ui/TeamLogo";
import { ColorWash } from "@/features/team/StatTile";

/** Player header. `bio` comes from the (slow, optional) career request and may be missing. */
export function PlayerHero({ player, bio }: { player: PlayerDetail; bio: PlayerCareer["bio"] | undefined }) {
  const { t, locale } = useI18n();
  const flag = flagEmoji(player.nationalityCode);

  const chips: { icon: ReactNode; label: string }[] = [];
  if (bio?.role) chips.push({ icon: <UserRound size={13} />, label: bio.role });
  // The player's own height is a hero fact; the (slower) career bio is only the fallback.
  if (bio?.heightCm && player.heightCm == null) chips.push({ icon: <Ruler size={13} />, label: t("player.height", { n: bio.heightCm }) });
  if (bio?.weightKg) chips.push({ icon: <Weight size={13} />, label: t("player.weight", { n: bio.weightKg }) });
  const contractEnd = bio?.contractEnd ?? player.contractUntil;
  if (contractEnd) {
    chips.push({
      icon: <FileSignature size={13} />,
      label: t("player.contractUntil", { date: formatDate(contractEnd, locale, { day: "numeric", month: "long", year: "numeric" }) }),
    });
  }

  const facts: { label: string; value: ReactNode; icon?: ReactNode; accent?: boolean }[] = [];
  if (player.marketValue != null) {
    facts.push({ label: t("value.market"), value: <span className="tnum">{formatMoney(player.marketValue, locale)}</span>, accent: true });
  }
  facts.push({ label: t("player.position"), value: t(`position.${player.position}`) });
  if (player.number != null) facts.push({ label: t("player.shirt"), value: <span className="tnum">{player.number}</span>, icon: <Shirt size={14} /> });
  if (player.age != null) {
    const born = player.birthDate ? formatDate(player.birthDate, locale, { day: "numeric", month: "long", year: "numeric" }) : undefined;
    facts.push({ label: t("player.age"), value: <span className="tnum" title={born}>{player.age}</span> });
  }
  if (player.nationality) {
    facts.push({
      label: t("player.nationality"),
      value: (
        <>
          {flag && <span aria-hidden>{flag}</span>}
          <span className="truncate">{player.nationality}</span>
        </>
      ),
    });
  }

  if (player.heightCm != null) {
    facts.push({ label: t("player.heightLabel"), value: <span className="tnum">{t("player.height", { n: player.heightCm })}</span>, icon: <Ruler size={14} /> });
  }
  if (player.foot) facts.push({ label: t("player.foot"), value: t(`player.foot.${player.foot}`), icon: <Footprints size={14} /> });

  return (
    <section className="card relative overflow-hidden">
      <ColorWash color={player.team.color} />
      <div className="relative p-4 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <PlayerAvatar name={player.name} photoUrl={player.photoUrl} number={player.number} size="xl" className="shadow-card" />
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{player.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/team/${player.team.slug}`} className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full bg-surface-2/80 py-1 pl-1 pr-3 text-sm font-semibold transition-colors hover:bg-surface-3">
                <TeamLogo team={player.team} size="sm" />
                <span className="truncate">{player.team.name}</span>
              </Link>
              {!player.isActive && (
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {t("player.left")}
                </span>
              )}
            </div>
          </div>
        </div>

        <dl className={cn("mt-5 grid grid-cols-2 gap-2", factColumns(facts.length))}>
          {facts.map((f) => (
            <div key={f.label} className={cn("min-w-0 rounded-xl px-3 py-2.5", f.accent ? "bg-brand/10 text-brand-700 dark:text-brand-200" : "bg-surface-2")}>
              <dt className={cn("text-[11px] font-semibold uppercase tracking-wide", f.accent ? "text-brand" : "text-ink-3")}>{f.label}</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 truncate text-[15px] font-bold">
                {f.icon && <span className="text-ink-3">{f.icon}</span>}
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        {(chips.length > 0 || player.transfermarktUrl) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2">
                <span className="text-ink-3">{c.icon}</span>
                {c.label}
              </li>
            ))}
            {player.transfermarktUrl && (
              <li>
                <a
                  href={player.transfermarktUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <ExternalLink size={13} className="text-ink-3" />
                  {t("player.onTransfermarkt")}
                </a>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Fact grid columns: a single row on wide screens where it fits, balanced rows below. */
function factColumns(n: number): string {
  if (n <= 4) return "sm:grid-cols-4";
  if (n === 5) return "sm:grid-cols-3 lg:grid-cols-5";
  if (n === 6) return "sm:grid-cols-3 lg:grid-cols-6";
  return "sm:grid-cols-4 lg:grid-cols-7";
}

export function PlayerHeroSkeleton() {
  return (
    <div className="card p-4 sm:p-6" aria-busy="true">
      <div className="flex items-center gap-4 sm:gap-6">
        <Skeleton className="h-24 w-24 rounded-full sm:h-28 sm:w-28" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[58px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
