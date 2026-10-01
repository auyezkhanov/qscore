import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ClubRef, Transfer, TransferFee } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn, flagEmoji, formatMoney } from "@/shared/lib/utils";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { TeamLogo } from "@/shared/ui/TeamLogo";

function Club({ club, align = "left" }: { club: ClubRef | null; align?: "left" | "right" }) {
  const { t } = useI18n();
  const content = club ? (
    <>
      <TeamLogo team={club} size="md" />
      <span className="truncate text-[13px] font-medium">{club.name}</span>
    </>
  ) : (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-ink-3">?</span>
      <span className="truncate text-[13px] text-ink-3">{t("transfers.freeAgent")}</span>
    </>
  );
  const cls = cn("flex min-w-0 items-center gap-2", align === "right" && "sm:flex-row-reverse sm:text-right");
  return club?.slug ? (
    <Link to={`/team/${club.slug}`} onClick={(e) => e.stopPropagation()} className={cn(cls, "hover:underline")}>
      {content}
    </Link>
  ) : (
    <span className={cls}>{content}</span>
  );
}

/** Fee pill: paid fees stand out, loans/frees are quieter, unknown fees render nothing. */
export function FeeBadge({ fee, className }: { fee: TransferFee | null; className?: string }) {
  const { t, locale } = useI18n();
  if (!fee || fee.type === "UNKNOWN" || (fee.type === "FEE" && fee.amount == null)) return null;
  const base = "inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-bold tnum";
  switch (fee.type) {
    case "FEE":
      return <span className={cn(base, "bg-brand text-brand-fg", className)}>{formatMoney(fee.amount!, locale)}</span>;
    case "LOAN_FEE":
      return (
        <span className={cn(base, "bg-amber-500/15 text-amber-700 dark:text-amber-300", className)}>
          {t("fee.LOAN_FEE", { amount: fee.amount != null ? formatMoney(fee.amount, locale) : "?" })}
        </span>
      );
    case "LOAN":
    case "END_OF_LOAN":
      return <span className={cn(base, "bg-surface-2 font-semibold text-ink-2", className)}>{t(`fee.${fee.type}` as const)}</span>;
    case "FREE":
      return <span className={cn(base, "px-0 font-semibold text-ink-3", className)}>{t("fee.FREE")}</span>;
  }
}

/**
 * One transfer: player (photo, position, nationality, age) and the
 * from → to clubs. Stacks on mobile, single line from `sm` up.
 */
export function TransferRow({ transfer }: { transfer: Transfer }) {
  const { t, locale } = useI18n();
  const { player } = transfer;
  const meta = [
    player.position ? t(`position.${player.position}` as const) : null,
    player.nationality ? `${flagEmoji(player.nationalityCode)} ${player.nationality}`.trim() : null,
    player.age ? t("common.years", { n: player.age }) : null,
  ].filter(Boolean);

  const playerBlock = (
    <div className="flex min-w-0 items-center gap-3">
      <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="md" />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{player.name}</span>
          {transfer.source === "tm" && (
            <span title={t("transfers.tmOnly")} className="shrink-0 rounded bg-surface-2 px-1 text-[10px] font-bold text-ink-3">
              TM
            </span>
          )}
        </div>
        <div className="truncate text-xs text-ink-3">{meta.join(" · ")}</div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-2 px-4 py-3 row-hover sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_20px_minmax(0,1fr)_112px] sm:items-center sm:gap-3">
      {player.slug ? (
        <Link to={`/player/${player.slug}`} className="min-w-0 hover:[&_div:first-child]:underline">
          {playerBlock}
        </Link>
      ) : (
        playerBlock
      )}
      <div className="flex min-w-0 items-center gap-2 pl-[52px] sm:contents sm:pl-0">
        <Club club={transfer.fromTeam} align="right" />
        <ArrowRight size={16} className="shrink-0 text-ink-3" />
        <Club club={transfer.toTeam} />
      </div>
      <div className="flex items-center gap-2 pl-[52px] empty:hidden sm:flex-col sm:items-end sm:gap-0.5 sm:pl-0">
        <FeeBadge fee={transfer.fee} />
        {transfer.marketValue != null && (
          <span className="text-[11px] text-ink-3 tnum">{t("transfers.valueAtMove", { value: formatMoney(transfer.marketValue, locale) })}</span>
        )}
      </div>
    </div>
  );
}
