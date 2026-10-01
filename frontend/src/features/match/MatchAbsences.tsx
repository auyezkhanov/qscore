import { Link } from "react-router-dom";
import { UserX } from "lucide-react";
import type { Absence, MatchDetail, TeamRef } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { CardHeader } from "@/shared/ui/Card";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { TeamLogo } from "@/shared/ui/TeamLogo";

export const hasAbsences = (m: MatchDetail) => m.absences.home.length > 0 || m.absences.away.length > 0;

/**
 * "Won't play": suspended players of both sides. `variant="card"` is a standalone card (overview),
 * `"section"` a block inside another card (lineups). Renders nothing when nobody is missing.
 */
export function MatchAbsences({ match, variant }: { match: MatchDetail; variant: "card" | "section" }) {
  const { t } = useI18n();
  if (!hasAbsences(match)) return null;

  const body = (
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-line">
      <SideList team={match.homeTeam} players={match.absences.home} />
      <SideList team={match.awayTeam} players={match.absences.away} className={cn(match.absences.home.length > 0 && "border-t border-line sm:border-t-0")} />
    </div>
  );

  if (variant === "card") {
    return (
      <section className="card overflow-hidden">
        <CardHeader title={t("absences.title")} icon={<UserX size={16} />} />
        {body}
      </section>
    );
  }
  return (
    <section className="border-t border-line">
      <h3 className="flex items-center gap-2 px-4 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-3 sm:px-5">
        <UserX size={13} aria-hidden />
        {t("absences.title")}
      </h3>
      {body}
    </section>
  );
}

function SideList({ team, players, className }: { team: TeamRef; players: Absence[]; className?: string }) {
  const { t } = useI18n();
  if (players.length === 0) return <div className={cn("hidden sm:block", className)} />;
  return (
    <div className={cn("py-2", className)}>
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-ink-2 sm:px-5">
        <TeamLogo team={team} size="xs" />
        <span className="truncate">{team.name}</span>
      </div>
      <ul>
        {players.map((p) => {
          const content = (
            <>
              <PlayerAvatar name={p.name} photoUrl={p.photoUrl} number={p.number} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {p.number != null && <span className="mr-1.5 text-xs font-semibold text-ink-3 tnum">{p.number}</span>}
                  {p.name}
                </span>
                <span className="block text-[11px] leading-snug text-ink-3">
                  <span className="font-semibold text-loss">{p.reason ?? t("absences.suspended")}</span>
                  {p.matchesSuspended != null && p.matchesSuspended > 0 && <> · {t("absences.matches", { n: p.matchesSuspended })}</>}
                </span>
              </span>
            </>
          );
          const cls = "flex items-center gap-3 px-4 py-2 sm:px-5";
          return (
            <li key={p.slug ?? p.name}>
              {p.slug ? (
                <Link to={`/player/${p.slug}`} className={cn(cls, "row-hover")}>
                  {content}
                </Link>
              ) : (
                <div className={cls}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
