import { useState } from "react";
import { Languages, Newspaper } from "lucide-react";
import type { NewsSummary } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import type { TranslationKey } from "@/shared/i18n/ru";
import { cn } from "@/shared/lib/utils";
import { LeagueBadge } from "@/shared/ui/LeagueBadge";
import { formatNewsTime } from "./newsDate";

const LEAGUE_KEYS: Record<string, TranslationKey> = {
  kpl: "league.kpl",
  "birinshi-liga": "league.birinshi-liga",
};

/** Localized league name for a news item, or null when it isn't tied to a known league. */
export function useNewsLeagueName(slug: string | null): string | null {
  const { t } = useI18n();
  const key = slug ? LEAGUE_KEYS[slug] : undefined;
  return key ? t(key) : null;
}

/**
 * News photo that fills its (positioned) parent, cropped from the top so
 * faces survive. Falls back to a branded placeholder when missing or broken.
 */
export function NewsImage({ src, className, iconSize = 28 }: { src: string | null; className?: string; iconSize?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div aria-hidden className={cn("flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 text-white/35", className)}>
        <Newspaper size={iconSize} strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("object-cover object-top", className)}
    />
  );
}

/** "Premier League · 2 hours ago" caption line. */
export function NewsMeta({ item, className }: { item: NewsSummary; className?: string }) {
  const { locale } = useI18n();
  const league = useNewsLeagueName(item.leagueSlug);
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 text-xs text-ink-3", className)}>
      {league && item.leagueSlug && (
        <>
          <LeagueBadge slug={item.leagueSlug} size="sm" />
          <span className="truncate font-semibold text-ink-2">{league}</span>
          <span aria-hidden>·</span>
        </>
      )}
      <time dateTime={item.publishedAt} className="shrink-0">
        {formatNewsTime(item.publishedAt, locale)}
      </time>
    </div>
  );
}

/** Shown when English was requested but the text is only available in Russian. */
export function OriginalLanguageNote({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <p className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-3", className)}>
      <Languages size={14} className="shrink-0" />
      {t("news.originalLanguage")}
    </p>
  );
}
