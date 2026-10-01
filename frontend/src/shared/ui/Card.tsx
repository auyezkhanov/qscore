import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function Card({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" | "aside" }) {
  return <Tag className={cn("card overflow-hidden", className)}>{children}</Tag>;
}

/** Card title row with an optional icon and a right-aligned action (link or control). */
export function CardHeader({
  title,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5", className)}>
      <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-tight">
        {icon && <span className="shrink-0 text-ink-3">{icon}</span>}
        <span className="truncate">{title}</span>
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** Small "See all ›" style link used in card headers. */
export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="-mr-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[13px] font-semibold text-brand transition-colors hover:text-brand-600 dark:hover:text-brand-300"
    >
      {children}
      <ChevronRight size={15} strokeWidth={2.5} />
    </Link>
  );
}

/** Full-width footer button/link at the bottom of a card. */
export function CardFooterLink({ to, onClick, children }: { to?: string; onClick?: () => void; children: ReactNode }) {
  const cls = "block w-full border-t border-line py-3 text-center text-sm font-semibold text-brand row-hover";
  return to ? (
    <Link to={to} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** Uppercase caption above a group of rows inside a card. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("px-4 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-wider text-ink-3 sm:px-5", className)}>{children}</h3>;
}
