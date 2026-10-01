import { Link } from "react-router-dom";
import { ChevronRight, Star } from "lucide-react";
import type { MatchDetail } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { RatingBadge } from "@/shared/ui/RatingBadge";
import { TeamLogo } from "@/shared/ui/TeamLogo";

/** Highlight card for the best-rated player of a finished match. */
export function PlayerOfTheMatch({ potm, match }: { potm: NonNullable<MatchDetail["playerOfTheMatch"]>; match: MatchDetail }) {
  const { t } = useI18n();
  const team = potm.side === "home" ? match.homeTeam : match.awayTeam;

  return (
    <section className="card overflow-hidden">
      <Link
        to={`/player/${potm.slug}`}
        className="group relative flex items-center gap-4 bg-gradient-to-r from-brand/[0.12] via-brand/[0.04] to-transparent px-4 py-4 transition-colors hover:from-brand/[0.18] sm:px-5"
      >
        <span className="relative flex shrink-0">
          <PlayerAvatar name={potm.name} photoUrl={potm.photoUrl} size="lg" className="ring-2 ring-brand/40" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface shadow ring-1 ring-line">
            <TeamLogo team={team} size="xs" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand">
            <Star size={12} className="fill-current" aria-hidden />
            {t("potm.title")}
          </span>
          <span className="mt-0.5 block truncate text-base font-bold group-hover:underline sm:text-lg">{potm.name}</span>
          <span className="block truncate text-xs text-ink-3">{team.name}</span>
        </span>
        <RatingBadge rating={potm.rating} size="lg" star className="text-base" />
        <ChevronRight size={18} className="hidden shrink-0 text-ink-3 sm:block" aria-hidden />
      </Link>
    </section>
  );
}
