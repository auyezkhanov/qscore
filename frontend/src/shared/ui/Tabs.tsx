import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

export type TabItem<K extends string = string> = { key: K; label: ReactNode; hidden?: boolean };

/**
 * Horizontally scrollable tab bar with an underline indicator. Fades the edges
 * when there's more to scroll and keeps the active tab in view.
 */
export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setFade({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [tabs.length]);

  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const mask =
    fade.left && fade.right
      ? "[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
      : fade.left
        ? "[mask-image:linear-gradient(to_right,transparent,black_24px)]"
        : fade.right
          ? "[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]"
          : "";

  return (
    <div className={cn("border-b border-line", className)}>
      <div ref={scroller} role="tablist" className={cn("scrollbar-none flex gap-1 overflow-x-auto px-2 sm:px-3", mask)}>
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => {
            const selected = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onChange(t.key)}
                className={cn(
                  "relative shrink-0 whitespace-nowrap px-3 py-3.5 text-sm font-semibold transition-colors",
                  selected ? "text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brand transition-opacity",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
      </div>
    </div>
  );
}

/**
 * Active tab stored in the `?tab=` query param, so reloads, shared links and
 * the back button keep the user on the same tab. Unknown values fall back.
 */
export function useTabParam<K extends string>(keys: readonly K[], fallback: K): [K, (key: K) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const active = (raw && (keys as readonly string[]).includes(raw) ? raw : fallback) as K;
  const setActive = useCallback(
    (key: K) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (key === fallback) next.delete("tab");
          else next.set("tab", key);
          return next;
        },
        { replace: true },
      ),
    [setParams, fallback],
  );
  return [active, setActive];
}
