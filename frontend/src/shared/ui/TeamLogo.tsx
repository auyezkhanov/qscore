import { useState } from "react";
import { cn } from "@/shared/lib/utils";

const SIZES = {
  xs: "h-4 w-4 text-[7px]",
  sm: "h-5 w-5 text-[8px]",
  md: "h-7 w-7 text-[10px]",
  lg: "h-10 w-10 text-xs",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl",
} as const;

export type LogoSize = keyof typeof SIZES;

function initials(name: string) {
  const letters = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/);
  return (letters.length > 1 ? letters[0][0] + letters[1][0] : (letters[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** Club crest; falls back to a coloured monogram when there's no logo or it fails to load. */
export function TeamLogo({
  team,
  size = "md",
  className,
}: {
  team: { name: string; logoUrl: string | null; color: string };
  size?: LogoSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (team.logoUrl && !failed) {
    return (
      <img
        src={team.logoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn("shrink-0 object-contain", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", SIZES[size], className)}
      style={{ backgroundColor: team.color }}
    >
      {initials(team.name)}
    </span>
  );
}
