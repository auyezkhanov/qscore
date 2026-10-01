import { useState } from "react";
import { Tv, Youtube } from "lucide-react";
import type { Broadcaster } from "@/shared/api/types";
import { cn } from "@/shared/lib/utils";

function Logo({ b }: { b: Broadcaster }) {
  const [failed, setFailed] = useState(false);
  if (b.logoUrl && !failed) {
    return <img src={b.logoUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="h-4 w-auto max-w-[56px] shrink-0 object-contain" />;
  }
  const Icon = b.type === "youtube" ? Youtube : Tv;
  return <Icon size={14} className="shrink-0 text-ink-3" />;
}

/** "Where to watch" chips: channel logo + name, linking to the broadcaster when known. */
export function BroadcasterList({ broadcasters, className, size = "md" }: { broadcasters: Broadcaster[]; className?: string; size?: "sm" | "md" }) {
  if (broadcasters.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {broadcasters.map((b) => {
        const chip = cn(
          "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface font-medium text-ink-2 transition-colors",
          size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
          b.url && "hover:border-brand/40 hover:text-ink",
        );
        return (
          <li key={b.name}>
            {b.url ? (
              <a href={b.url} target="_blank" rel="noopener noreferrer" className={chip} onClick={(e) => e.stopPropagation()}>
                <Logo b={b} />
                {b.name}
              </a>
            ) : (
              <span className={chip}>
                <Logo b={b} />
                {b.name}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
