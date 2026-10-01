import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

/** Pill-shaped toggle used for filters. */
export function ToggleChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition active:scale-95",
        active ? "bg-ink text-bg" : "bg-surface text-ink-2 shadow-card ring-1 ring-line hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Segmented control: exactly one option active. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-full bg-surface-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition",
              size === "sm" ? "h-7 min-w-[2.25rem] px-2.5 text-xs" : "h-8 min-w-[2.5rem] px-3 text-[13px]",
              active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
