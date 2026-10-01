import { Trophy } from "lucide-react";
import kplLogo from "@/assets/leagues/kpl.png";
import firstLeagueLogo from "@/assets/leagues/birinshi-liga.png";
import { cn } from "@/shared/lib/utils";

const LOGOS: Record<string, string> = { kpl: kplLogo, "birinshi-liga": firstLeagueLogo };
const SIZES = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-12 w-12 sm:h-14 sm:w-14" } as const;

export function LeagueBadge({ slug, size = "md", className }: { slug: string; size?: keyof typeof SIZES; className?: string }) {
  const logo = LOGOS[slug];
  if (logo) return <img src={logo} alt="" className={cn("shrink-0 object-contain", SIZES[size], className)} />;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-2", SIZES[size], className)}>
      <Trophy size={size === "lg" ? 22 : 12} />
    </span>
  );
}
