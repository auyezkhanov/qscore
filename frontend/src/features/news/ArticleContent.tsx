import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/shared/lib/utils";

// Presentational attributes from the source CMS fight our theme (fixed fonts,
// black text on a dark background, fixed widths), so they are dropped.
const FORBID_ATTR = ["style", "class", "id", "width", "height", "align", "color", "face", "bgcolor", "border", "cellpadding", "cellspacing"];
// <font>/<center> are unwrapped (their text is kept); <style> is removed.
const FORBID_TAGS = ["style", "font", "center"];

/** Sanitizes source HTML and adapts it: external links in a new tab, lazy images, scrollable tables, no empty paragraphs. */
function prepareHtml(html: string): string {
  const fragment = DOMPurify.sanitize(html, { FORBID_ATTR, FORBID_TAGS, RETURN_DOM_FRAGMENT: true });

  fragment.querySelectorAll("a[href]").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
  fragment.querySelectorAll("img").forEach((img) => {
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  });
  fragment.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "overflow-x-auto";
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });
  fragment.querySelectorAll("p, div").forEach((el) => {
    if (!el.textContent?.trim() && !el.querySelector("img, video, table")) el.remove();
  });

  const container = document.createElement("div");
  container.appendChild(fragment);
  return container.innerHTML;
}

// Prose styling done by hand (no typography plugin), themed through tokens.
const PROSE = [
  "break-words text-[15px] leading-7 text-ink-2 sm:text-base sm:leading-[1.75]",
  "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
  "[&_p]:my-4 [&>div]:my-4",
  "[&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-ink",
  "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink",
  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink",
  "[&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:font-bold [&_h4]:text-ink",
  "[&_b]:font-semibold [&_b]:text-ink [&_strong]:font-semibold [&_strong]:text-ink",
  "[&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:decoration-brand/40 [&_a]:underline-offset-2 hover:[&_a]:decoration-brand",
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5 [&_li]:pl-1 [&_li::marker]:text-ink-3",
  "[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl",
  "[&_figure]:my-6 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-ink-3",
  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-brand [&_blockquote]:py-1 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink",
  "[&_hr]:my-8 [&_hr]:border-line",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-line [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink",
].join(" ");

export function ArticleContent({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => prepareHtml(html), [html]);
  return <div className={cn(PROSE, className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
