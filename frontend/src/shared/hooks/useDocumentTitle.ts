import { useEffect } from "react";

/** Sets the tab title as "<title> · Qscore" (just "Qscore" when empty). */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Qscore` : "Qscore";
  }, [title]);
}
