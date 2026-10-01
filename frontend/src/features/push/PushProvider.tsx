import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, request } from "@/shared/api/client";
import type { PushFollows } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n/LanguageProvider";

type Status = "unsupported" | "idle" | "denied" | "subscribed";

type PushContextValue = {
  status: Status;
  busy: boolean;
  follows: PushFollows;
  isFollowing: (kind: "team" | "match", id: string) => boolean;
  /** Follows/unfollows; asks for notification permission first when needed. Resolves false if not allowed. */
  setFollow: (kind: "team" | "match", id: string, follow: boolean) => Promise<boolean>;
  disable: () => Promise<void>;
};

const PushContext = createContext<PushContextValue | null>(null);
const EMPTY: PushFollows = { teamIds: [], matchIds: [] };

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function base64UrlToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const subscriptionBody = (sub: PushSubscription, lang: string) => {
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  return { subscription: { endpoint: json.endpoint, keys: json.keys }, lang };
};

/**
 * Web push for followed clubs and matches. The browser subscription is the
 * identity: follows live on the server under its endpoint, no account needed.
 */
export function PushProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const [status, setStatus] = useState<Status>(() => (supported() ? (Notification.permission === "denied" ? "denied" : "idle") : "unsupported"));
  const [busy, setBusy] = useState(false);
  const [follows, setFollows] = useState<PushFollows>(EMPTY);
  const subRef = useRef<PushSubscription | null>(null);

  // Restore an existing subscription (and re-register it if the server forgot it).
  useEffect(() => {
    if (!supported()) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!sub || cancelled) return;
        subRef.current = sub;
        const data = await request<PushFollows>("/push/subscriptions", { query: { endpoint: sub.endpoint } }).catch(async (err) => {
          if (err instanceof ApiError && err.isNotFound) return request<PushFollows>("/push/subscriptions", { method: "POST", body: subscriptionBody(sub, lang) });
          throw err;
        });
        if (!cancelled) {
          setFollows(data);
          setStatus("subscribed");
        }
      } catch {
        /* push is an enhancement; the rest of the app works without it */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount; language updates are pushed by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep notification language in sync with the UI.
  useEffect(() => {
    const sub = subRef.current;
    if (sub && status === "subscribed") void request("/push/subscriptions", { method: "POST", body: subscriptionBody(sub, lang) }).catch(() => undefined);
  }, [lang, status]);

  const ensureSubscribed = useCallback(async (): Promise<PushSubscription | null> => {
    if (subRef.current) return subRef.current;
    if (!supported()) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "denied" : "idle");
      return null;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { key } = await request<{ key: string }>("/push/public-key");
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) });
    const data = await request<PushFollows>("/push/subscriptions", { method: "POST", body: subscriptionBody(sub, lang) });
    subRef.current = sub;
    setFollows(data);
    setStatus("subscribed");
    return sub;
  }, [lang]);

  const setFollow = useCallback(
    async (kind: "team" | "match", id: string, follow: boolean) => {
      setBusy(true);
      try {
        const sub = await ensureSubscribed();
        if (!sub) return false;
        const data = await request<PushFollows>("/push/subscriptions/follow", {
          method: "PUT",
          body: { endpoint: sub.endpoint, follow, ...(kind === "team" ? { teamId: id } : { matchId: id }) },
        });
        setFollows(data);
        return true;
      } catch {
        return false;
      } finally {
        setBusy(false);
      }
    },
    [ensureSubscribed],
  );

  const disable = useCallback(async () => {
    const sub = subRef.current;
    if (!sub) return;
    setBusy(true);
    try {
      await request("/push/subscriptions", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => undefined);
      await sub.unsubscribe();
      subRef.current = null;
      setFollows(EMPTY);
      setStatus("idle");
    } finally {
      setBusy(false);
    }
  }, []);

  const isFollowing = useCallback(
    (kind: "team" | "match", id: string) => (kind === "team" ? follows.teamIds : follows.matchIds).includes(id),
    [follows],
  );

  const value = useMemo(() => ({ status, busy, follows, isFollowing, setFollow, disable }), [status, busy, follows, isFollowing, setFollow, disable]);
  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export function usePush() {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used within PushProvider");
  return ctx;
}
