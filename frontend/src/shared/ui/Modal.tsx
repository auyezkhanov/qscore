import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./Button";

/** Accessible dialog: portal, backdrop click / Escape to close, focus moved in and restored. */
export function Modal({ title, onClose, closeLabel, children }: { title: ReactNode; onClose: () => void; closeLabel: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, button, [href]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4" onPointerDown={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-t-3xl border border-line bg-surface p-6 shadow-pop animate-pop-in sm:rounded-3xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          <IconButton aria-label={closeLabel} size="sm" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
