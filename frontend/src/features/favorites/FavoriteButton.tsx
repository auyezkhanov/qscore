import { Star } from "lucide-react";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { useFavorites } from "./FavoritesProvider";

export function FavoriteButton({ matchId, className, size = 16 }: { matchId: string; className?: string; size?: number }) {
  const { isFavorite, toggle } = useFavorites();
  const { t } = useI18n();
  const active = isFavorite(matchId);
  return (
    <button
      type="button"
      onClick={(e) => {
        // Usually rendered inside a row link.
        e.preventDefault();
        e.stopPropagation();
        toggle(matchId);
      }}
      aria-pressed={active}
      aria-label={active ? t("match.removeFavorite") : t("match.addFavorite")}
      title={active ? t("match.removeFavorite") : t("match.addFavorite")}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-surface-3 active:scale-75",
        active ? "text-amber-500" : "text-ink-3/60 hover:text-ink-2",
        className,
      )}
    >
      <Star size={size} className={cn("transition-transform", active && "fill-current")} />
    </button>
  );
}
