import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { request } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthProvider";

type FavoritesContextValue = {
  isFavorite: (matchId: string) => boolean;
  toggle: (matchId: string) => void;
  count: number;
};

const STORAGE_KEY = "qscore:favorites";
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readLocal(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * Favourite matches. Signed out: stored in localStorage. Signed in: the server
 * is the source of truth — on sign-in the local picks are merged into the
 * account, then every toggle is applied optimistically and synced.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(readLocal);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const mergedFor = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      /* ignore */
    }
  }, [ids]);

  useEffect(() => {
    if (!user) {
      mergedFor.current = null;
      return;
    }
    if (mergedFor.current === user.id) return;
    mergedFor.current = user.id;
    request<string[]>("/favorites/merge", { method: "POST", body: { matchIds: [...idsRef.current] } })
      .then((merged) => setIds(new Set(merged)))
      .catch(() => {
        /* keep local picks; the next sign-in retries the merge */
        mergedFor.current = null;
      });
  }, [user]);

  const toggle = useCallback(
    (matchId: string) => {
      const willAdd = !idsRef.current.has(matchId);
      const apply = (add: boolean) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (add) next.add(matchId);
          else next.delete(matchId);
          return next;
        });
      apply(willAdd);
      if (!user) return;
      request<string[]>(`/favorites/${encodeURIComponent(matchId)}`, { method: willAdd ? "PUT" : "DELETE" })
        .then((server) => setIds(new Set(server)))
        .catch(() => apply(!willAdd)); // roll back the optimistic change
    },
    [user],
  );

  const isFavorite = useCallback((matchId: string) => ids.has(matchId), [ids]);
  const value = useMemo(() => ({ isFavorite, toggle, count: ids.size }), [isFavorite, toggle, ids.size]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
