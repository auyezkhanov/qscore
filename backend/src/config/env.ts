import { z } from "zod";

const boolFromString = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  /** Comma-separated list of allowed origins; "*" allows any. */
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DEEPL_API_KEY: z.string().optional().default(""),
  /** Public site URL: links in calendar feeds and push notifications. */
  PUBLIC_URL: z.string().url().default("http://localhost:15173"),
  /**
   * Which proxies may set X-Forwarded-For (client IP for rate limits): a hop count
   * such as "1" behind a PaaS edge (Railway, Render), or Express names/CIDRs.
   * The default trusts only a reverse proxy on a private network (nginx in docker).
   */
  TRUST_PROXY: z
    .string()
    .default("loopback, linklocal, uniquelocal")
    .transform((v) => (/^[0-9]+$/.test(v.trim()) ? Number(v) : v)),
  /** Background sync with kffleague.kz. Disable for offline development. */
  SYNC_ENABLED: boolFromString.default("true"),
  LIVE_SYNC_INTERVAL_SEC: z.coerce.number().int().min(15).default(60),
  FULL_SYNC_INTERVAL_MIN: z.coerce.number().int().min(10).default(360),
  /** Daily enrichment with market values and transfer fees from transfermarkt.com. */
  TM_SYNC_ENABLED: boolFromString.default("true"),
  TM_SYNC_INTERVAL_HOURS: z.coerce.number().int().min(6).default(24),
});

export type Env = z.infer<typeof EnvSchema>;

const PLACEHOLDER_SECRETS = ["change-me-to-a-long-random-string", "changeme", "secret"];

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  // A copied example secret would let anyone forge tokens.
  if (parsed.data.NODE_ENV === "production" && (parsed.data.JWT_SECRET.length < 32 || PLACEHOLDER_SECRETS.includes(parsed.data.JWT_SECRET))) {
    throw new Error("JWT_SECRET must be a random string of at least 32 characters in production");
  }
  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((s) => s.trim());
