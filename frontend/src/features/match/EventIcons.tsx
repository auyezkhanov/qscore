import { cn } from "@/shared/lib/utils";

/**
 * A classic football: white ball, dark centre pentagon and panel seams. Fixed
 * colours so it reads the same on light and dark surfaces; `own` tints it red.
 */
export function BallIcon({ size = 16, own = false, className }: { size?: number; own?: boolean; className?: string }) {
  const ink = own ? "#dc2626" : "#1f2933";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      <circle cx="12" cy="12" r="10.5" fill={own ? "#fee2e2" : "#fff"} stroke={ink} strokeWidth="1.5" />
      <path d="M12 7.2l4.6 3.3-1.8 5.4H9.2L7.4 10.5z" fill={ink} />
      <path d="M12 7.2V1.8M16.6 10.5l5-1.7M14.8 15.9l3.1 4.3M9.2 15.9l-3.1 4.3M7.4 10.5l-5-1.7" stroke={ink} strokeWidth="1.3" fill="none" />
    </svg>
  );
}

/** Booking card; `second` draws a yellow card behind a red one (second yellow). */
export function CardIcon({ color, second = false, className }: { color: "yellow" | "red"; second?: boolean; className?: string }) {
  if (second) {
    return (
      <span aria-hidden className={cn("relative inline-block h-[15px] w-[14px] shrink-0", className)}>
        <span className="absolute left-0 top-0 h-[13px] w-[9.5px] rounded-[2px] bg-card-yellow" />
        <span className="absolute bottom-0 right-0 h-[13px] w-[9.5px] rounded-[2px] bg-card-red ring-1 ring-surface" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-block h-[14px] w-[10px] shrink-0 rounded-[2px]", color === "yellow" ? "bg-card-yellow" : "bg-card-red", className)}
    />
  );
}
