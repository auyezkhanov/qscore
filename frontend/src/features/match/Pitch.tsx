import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

const STRIPES = 12;

/**
 * A football pitch drawn with CSS stripes and SVG markings. Landscape from `sm`
 * up (goals left/right), portrait on phones (goals top/bottom). Children are
 * absolutely positioned in % of the pitch box.
 */
export function Pitch({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative isolate aspect-[3/5] w-full overflow-hidden rounded-xl bg-[#2c7a47] sm:aspect-[105/68]", className)}>
      <div aria-hidden className="absolute inset-0 -z-10 flex flex-col dark:opacity-80 sm:flex-row">
        {Array.from({ length: STRIPES }, (_, i) => (
          <div key={i} className={cn("flex-1", i % 2 === 0 ? "bg-white/[0.06]" : "bg-black/[0.04]")} />
        ))}
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(0_0_0/0.18))]" />
      <PitchLines className="absolute inset-0 -z-10 hidden h-full w-full sm:block" orientation="landscape" />
      <PitchLines className="absolute inset-0 -z-10 h-full w-full sm:hidden" orientation="portrait" />
      {children}
    </div>
  );
}

// Real pitch proportions in metres (105 × 68), drawn landscape and rotated for portrait.
const L = 105;
const W = 68;
const INSET = 2;

function PitchLines({ orientation, className }: { orientation: "landscape" | "portrait"; className?: string }) {
  const box = orientation === "landscape" ? `0 0 ${L} ${W}` : `0 0 ${W} ${L}`;
  // Shrink the drawing a little so the outline isn't glued to the rounded edge.
  const inner = `translate(${INSET} ${INSET}) scale(${(L - 2 * INSET) / L} ${(W - 2 * INSET) / W})`;
  const rotate = orientation === "portrait" ? `translate(${W} 0) rotate(90)` : undefined;
  const penaltyW = 40.32;
  const goalAreaW = 18.32;

  return (
    <svg viewBox={box} preserveAspectRatio="none" className={className}>
      <g transform={rotate}>
        <g transform={inner} fill="none" stroke="white" strokeOpacity={0.55} strokeWidth={1.5} vectorEffect="non-scaling-stroke">
          <rect x={0} y={0} width={L} height={W} vectorEffect="non-scaling-stroke" />
          <line x1={L / 2} y1={0} x2={L / 2} y2={W} vectorEffect="non-scaling-stroke" />
          <circle cx={L / 2} cy={W / 2} r={9.15} vectorEffect="non-scaling-stroke" />
          <circle cx={L / 2} cy={W / 2} r={0.6} fill="white" fillOpacity={0.6} stroke="none" />
          {[0, 1].map((end) => {
            const x = (d: number) => (end === 0 ? d : L - d);
            return (
              <g key={end}>
                <rect x={end === 0 ? 0 : L - 16.5} y={(W - penaltyW) / 2} width={16.5} height={penaltyW} vectorEffect="non-scaling-stroke" />
                <rect x={end === 0 ? 0 : L - 5.5} y={(W - goalAreaW) / 2} width={5.5} height={goalAreaW} vectorEffect="non-scaling-stroke" />
                <circle cx={x(11)} cy={W / 2} r={0.5} fill="white" fillOpacity={0.6} stroke="none" />
                {/* Penalty arc: the part of the 9.15 m circle around the spot that lies outside the box. */}
                <path
                  d={`M ${x(16.5)} ${W / 2 - 7.31} A 9.15 9.15 0 0 ${end === 0 ? 1 : 0} ${x(16.5)} ${W / 2 + 7.31}`}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
