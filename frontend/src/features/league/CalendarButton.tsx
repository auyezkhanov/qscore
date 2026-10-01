import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarPlus, Download, Rss } from "lucide-react";
import { calendarUrl } from "@/shared/api/queries";
import { useI18n } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/lib/utils";

const PANEL_WIDTH = 288;
const GUTTER = 16;

/** Fixed position under the trigger, kept inside the viewport. */
function panelPosition(trigger: HTMLElement, align: "left" | "right") {
  const r = trigger.getBoundingClientRect();
  const width = Math.min(PANEL_WIDTH, window.innerWidth - GUTTER * 2);
  const preferred = align === "right" ? r.right - width : r.left;
  const left = Math.max(GUTTER, Math.min(preferred, window.innerWidth - width - GUTTER));
  return { top: r.bottom + 8, left, width };
}

/**
 * "Add to calendar" pill with a small popover: subscribe to the live .ics feed
 * (webcal:// for Apple/Outlook, Google's add-by-URL) or download a one-off file.
 */
export function CalendarButton({
  kind,
  slug,
  align = "right",
  className,
}: {
  kind: "teams" | "leagues";
  slug: string;
  align?: "left" | "right";
  className?: string;
}) {
  const { t, lang } = useI18n();
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const open = pos != null;
  const close = useCallback(() => setPos(null), []);
  const toggle = () => setPos((p) => (p || !trigger.current ? null : panelPosition(trigger.current, align)));

  // The panel is portalled (hero cards clip overflow), so dismiss on outside press, Escape, scroll or resize.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  const httpUrl = calendarUrl(kind, slug, lang);
  const webcalUrl = httpUrl.replace(/^https?:\/\//, "webcal://");
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={cn(
          className,
          "inline-flex h-8 shrink-0 select-none items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition active:scale-95",
          open ? "bg-surface-3 text-ink" : "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink",
        )}
      >
        <CalendarPlus size={15} />
        <span>{t("calendar.add")}</span>
      </button>

      {pos &&
        createPortal(
          <div
            ref={panel}
            id={menuId}
            style={pos}
            className="fixed z-50 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop animate-pop-in"
          >
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">{t("calendar.title")}</p>
            <MenuLink href={webcalUrl} icon={<Rss size={17} />} title={t("calendar.subscribe")} hint={t("calendar.subscribeHint")} onClick={close} />
            <MenuLink href={googleUrl} external icon={<GoogleMark />} title={t("calendar.google")} hint={t("calendar.googleHint")} onClick={close} />
            <MenuLink href={httpUrl} download icon={<Download size={17} />} title={t("calendar.download")} hint={t("calendar.downloadHint")} onClick={close} />
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuLink({
  href,
  icon,
  title,
  hint,
  external = false,
  download = false,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  hint: string;
  external?: boolean;
  download?: boolean;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      download={download ? "" : undefined}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 row-hover"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-ink-3">{hint}</span>
      </span>
    </a>
  );
}

/** Tiny four-colour "G" so the Google option reads at a glance. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
