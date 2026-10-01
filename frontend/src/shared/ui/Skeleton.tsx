import { cn } from "@/shared/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-surface-3/70", className)} />;
}

export function SkeletonRows({ rows = 5, className, rowClassName = "h-12" }: { rows?: number; className?: string; rowClassName?: string }) {
  return (
    <div className={cn("space-y-2 p-4", className)} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("w-full", rowClassName)} />
      ))}
    </div>
  );
}

/** Placeholder shaped like a card with a header and rows. */
export function SkeletonCard({ rows = 5, rowClassName, className }: { rows?: number; rowClassName?: string; className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)} aria-busy="true">
      <div className="border-b border-line px-5 py-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <SkeletonRows rows={rows} rowClassName={rowClassName} />
    </div>
  );
}
