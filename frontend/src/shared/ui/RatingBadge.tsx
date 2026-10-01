import { cn } from "@/shared/lib/utils";

/** FotMob-style colour bands for a 3–10 match rating. */
export function ratingTone(rating: number): string {
  if (rating >= 9) return "bg-[#1b73e8] text-white"; // world class
  if (rating >= 8) return "bg-[#0e9f6e] text-white";
  if (rating >= 7) return "bg-[#22c55e] text-white";
  if (rating >= 6) return "bg-[#f59e0b] text-white";
  if (rating >= 5) return "bg-[#f97316] text-white";
  return "bg-[#ef4444] text-white";
}

const SIZES = {
  xs: "h-4 min-w-[1.75rem] px-1 text-[10px]",
  sm: "h-5 min-w-[2rem] px-1.5 text-[11px]",
  md: "h-6 min-w-[2.5rem] px-2 text-xs",
  lg: "h-8 min-w-[3rem] px-2.5 text-sm",
} as const;

/** Rating pill; renders nothing for unrated players. `star` marks the player of the match. */
export function RatingBadge({
  rating,
  size = "sm",
  star = false,
  className,
}: {
  rating: number | null | undefined;
  size?: keyof typeof SIZES;
  star?: boolean;
  className?: string;
}) {
  if (rating == null) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center gap-0.5 rounded-md font-extrabold tnum leading-none shadow-sm", ratingTone(rating), SIZES[size], className)}>
      {star && <span aria-hidden>★</span>}
      {rating.toFixed(1)}
    </span>
  );
}
