import { cn } from "@/shared/lib/utils";

/** Small football glyph (lucide has none); inherits the text colour. */
export function BallIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={cn("shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.2l4.1 3-1.6 4.8h-5l-1.6-4.8z" fill="currentColor" stroke="none" />
      <path d="M12 7.2V2.3M16.1 10.2l4.6-1.6M14.5 15l2.9 4M9.5 15l-2.9 4M7.9 10.2L3.3 8.6" strokeLinecap="round" />
    </svg>
  );
}

/** Booking card rectangle. */
export function BookingCard({ color, className }: { color: "yellow" | "red"; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] shadow-sm", color === "yellow" ? "bg-card-yellow" : "bg-card-red", className)} />;
}
