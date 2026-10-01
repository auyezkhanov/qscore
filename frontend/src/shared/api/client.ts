import type { Lang } from "./types";

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
const BASE_URL = API_BASE_URL;
const TOKEN_KEY = "qscore:token";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    /** Stable machine-readable code from the backend, e.g. "NOT_FOUND", "EMAIL_TAKEN". */
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }

  get isNotFound() {
    return this.status === 404;
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable (private mode): the session just won't persist */
    }
  },
};

type Query = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  lang?: Lang;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export function buildUrl(path: string, query?: Query, lang?: Lang): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  if (lang) params.set("lang", lang);
  const qs = params.toString();
  return `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query, opts.lang), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Network error");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, error?.code ?? "HTTP_ERROR", error?.message ?? `HTTP ${res.status}`);
  }
  return data as T;
}

/** URL of a player photo routed through the backend's background-softening proxy. */
export function avatarUrl(photoUrl: string | null | undefined): string | null {
  return photoUrl ? buildUrl("/media/avatar", { url: photoUrl }) : null;
}
