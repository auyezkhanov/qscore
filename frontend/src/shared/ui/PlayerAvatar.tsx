import { useState } from "react";
import { avatarUrl } from "@/shared/api/client";
import { cn } from "@/shared/lib/utils";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl sm:h-28 sm:w-28",
} as const;

/**
 * Player photo on a neutral disc (routed through the backend so the source's
 * white padding becomes transparent). Falls back to initials, or the shirt
 * number when given, if there is no photo or it fails to load.
 */
export function PlayerAvatar({
  name,
  photoUrl,
  size = "md",
  number,
  className,
}: {
  name: string;
  photoUrl: string | null | undefined;
  size?: keyof typeof SIZES;
  number?: number | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : avatarUrl(photoUrl);
  const base = cn("relative shrink-0 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line", SIZES[size], className);

  if (!src) {
    const label = number != null ? String(number) : name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return (
      <span aria-hidden className={cn(base, "inline-flex items-center justify-center font-bold text-ink-3")}>
        {label}
      </span>
    );
  }
  return (
    <span className={base}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover object-top"
      />
    </span>
  );
}
