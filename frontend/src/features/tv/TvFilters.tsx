import type { ReactNode } from "react";
import { Tv } from "lucide-react";
import type { LeagueRef } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { ToggleChip } from "@/shared/ui/Chip";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {children}
    </div>
  );
}

/** League and channel filter chips; a row is hidden when it would offer no real choice. */
export function TvFilters({
  leagues,
  channels,
  league,
  channel,
  onLeague,
  onChannel,
}: {
  leagues: LeagueRef[];
  channels: string[];
  league: string | null;
  channel: string | null;
  onLeague: (slug: string | null) => void;
  onChannel: (name: string | null) => void;
}) {
  const { t } = useI18n();
  if (leagues.length < 2 && channels.length === 0) return null;

  return (
    <div className="space-y-2">
      {leagues.length > 1 && (
        <ChipRow label={t("nav.leagues")}>
          <ToggleChip active={league == null} onClick={() => onLeague(null)}>
            {t("league.all")}
          </ToggleChip>
          {leagues.map((l) => (
            <ToggleChip key={l.slug} active={league === l.slug} onClick={() => onLeague(league === l.slug ? null : l.slug)}>
              <LeagueBadge slug={l.slug} size="sm" className="-ml-1" />
              {l.name}
            </ToggleChip>
          ))}
        </ChipRow>
      )}
      {channels.length > 0 && (
        <ChipRow label={t("tv.channels")}>
          <ToggleChip active={channel == null} onClick={() => onChannel(null)}>
            <Tv size={14} aria-hidden />
            {t("tv.allChannels")}
          </ToggleChip>
          {channels.map((name) => (
            <ToggleChip key={name} active={channel === name} onClick={() => onChannel(channel === name ? null : name)}>
              {name}
            </ToggleChip>
          ))}
        </ChipRow>
      )}
    </div>
  );
}
