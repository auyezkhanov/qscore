import { ratingTone } from "@/shared/ui/RatingBadge";

// Chart colours as CSS variable references, so SVG strokes/fills follow the
// light/dark theme tokens (src/index.css) without re-rendering on theme change.
export const CHART = {
  brand: "rgb(var(--brand))",
  ink: "rgb(var(--ink))",
  ink2: "rgb(var(--ink-2))",
  ink3: "rgb(var(--ink-3))",
  line: "rgb(var(--line))",
  surface: "rgb(var(--surface))",
} as const;

/** Fill colour of a rating band, taken from `ratingTone` so SVG dots match the rating pills. */
export function ratingColor(rating: number): string {
  return ratingTone(rating).match(/#[0-9a-f]{3,8}/i)?.[0] ?? CHART.ink3;
}
