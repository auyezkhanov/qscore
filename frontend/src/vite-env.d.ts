/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL; defaults to same-origin "/api" (proxied by Vite in dev and nginx in prod). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
