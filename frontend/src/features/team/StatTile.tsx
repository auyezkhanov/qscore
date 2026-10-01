import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Big number with a small caption underneath (hero and season summaries). */
export function StatTile({ value, label, sub, className }: { value: ReactNode; label: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center justify-center rounded-xl bg-surface-2 px-2 py-3 text-center", className)}>
      <span className="text-xl font-extrabold leading-none tracking-tight tnum sm:text-2xl">{value}</span>
      <span className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
      {sub && <span className="mt-0.5 truncate text-[11px] text-ink-3">{sub}</span>}
    </div>
  );
}

/** Soft radial wash in a club colour behind a hero card; ignored for non-hex colours. */
export function ColorWash({ color }: { color: string | null | undefined }) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-90 dark:opacity-60"
      style={{ background: `radial-gradient(120% 90% at 0% 0%, ${color}2e 0%, ${color}0f 45%, transparent 75%)` }}
    />
  );
}
