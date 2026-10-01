import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";
import { usePush } from "./PushProvider";

/**
 * Bell toggle for push notifications about a club or a match. Hidden where the
 * browser has no web push; disabled (with a hint) when notifications are blocked.
 */
export function FollowButton({ kind, id, variant = "pill", className }: { kind: "team" | "match"; id: string; variant?: "pill" | "icon"; className?: string }) {
  const { t } = useI18n();
  const { status, busy, isFollowing, setFollow } = usePush();
  if (status === "unsupported") return null;

  const following = isFollowing(kind, id);
  const denied = status === "denied";
  const label = denied ? t("push.blocked") : following ? t("push.following") : t(kind === "team" ? "push.followTeam" : "push.followMatch");
  const Icon = busy ? Loader2 : denied ? BellOff : following ? BellRing : Bell;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void setFollow(kind, id, !following);
      }}
      disabled={busy || denied}
      aria-pressed={following}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center gap-1.5 rounded-full font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "pill" ? "h-8 px-3 text-[13px]" : "h-8 w-8",
        following ? "bg-brand text-brand-fg" : "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink",
        className,
      )}
    >
      <Icon size={15} className={cn(busy && "animate-spin")} />
      {variant === "pill" && <span>{label}</span>}
    </button>
  );
}
