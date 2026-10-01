import { Router } from "express";
import sharp from "sharp";
import { z } from "zod";
import { TtlCache } from "../../lib/cache";
import { handler, HttpError, parse } from "../../lib/http";
import { createLogger } from "../../lib/logger";
import { upstreamLimiter } from "../../lib/rateLimit";
import { USER_AGENT } from "../../integrations/kff/client";

const log = createLogger("media");
const router = Router();

const ALLOWED_HOSTS = new Set(["kffleague.kz"]);
const ALLOWED_PATH_PREFIX = "/storage/";
const MAX_BYTES = 15 * 1024 * 1024;
// Decompression-bomb guard: refuse images that would expand past ~25 megapixels.
const MAX_PIXELS = 25_000_000;
// Avatars render at most ~112px wide; 256px covers 2x screens and keeps responses tiny.
const AVATAR_SIZE = 256;
// Channel minimum at/above which a pixel is treated as background padding.
const OPAQUE_BELOW = 225;
const TRANSPARENT_AT = 245;

const cache = new TtlCache<Buffer>(7 * 24 * 60 * 60 * 1000, 1500);

/** Canonical form of an allowed image URL (no query/hash, so the cache can't be busted), or null. */
export function normalizeImageUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname) || u.port || u.username || u.password) return null;
  if (!u.pathname.startsWith(ALLOWED_PATH_PREFIX) || u.pathname.includes("..")) return null;
  return `https://${u.hostname}${u.pathname}`;
}

const query = z.object({
  url: z
    .string()
    .max(500)
    .transform((raw, ctx) => {
      const url = normalizeImageUrl(raw);
      if (!url) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "url not allowed" });
      return url ?? "";
    }),
});

const avatarLimiter = upstreamLimiter(120);

async function download(url: string): Promise<Buffer> {
  // The source CDN rejects requests without a browser-like User-Agent.
  // Redirects are not followed: they could point outside the allowlist.
  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { Accept: "image/*", "User-Agent": USER_AGENT } });
  if (res.status === 404) throw new HttpError(404, "NOT_FOUND", "Image not found");
  if (!res.ok) throw new HttpError(502, "UPSTREAM_UNAVAILABLE", `image upstream ${res.status}`);
  if (!(res.headers.get("content-type") ?? "").startsWith("image/")) throw new HttpError(502, "UPSTREAM_UNAVAILABLE", "upstream is not an image");
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) throw new HttpError(413, "IMAGE_TOO_LARGE");
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new HttpError(413, "IMAGE_TOO_LARGE");
  return buffer;
}

/**
 * Source player photos have their padding baked in as opaque near-white
 * pixels, so they look like white boxes on a dark theme. Fade that padding
 * into real transparency. Purely cosmetic: on any failure, serve the original.
 */
async function softenBackground(input: Buffer): Promise<Buffer> {
  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_PIXELS }).resize({ width: AVATAR_SIZE, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += info.channels) {
      const alpha = data[i + 3];
      if (alpha === 0) continue;
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (min >= TRANSPARENT_AT) data[i + 3] = 0;
      else if (min > OPAQUE_BELOW) data[i + 3] = Math.round(alpha * (1 - (min - OPAQUE_BELOW) / (TRANSPARENT_AT - OPAQUE_BELOW)));
    }
    return await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .webp({ quality: 88 })
      .toBuffer();
  } catch (err) {
    log.warn("avatar conversion failed, serving original", err);
    return sharp(input, { limitInputPixels: MAX_PIXELS }).resize({ width: AVATAR_SIZE, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  }
}

router.get(
  "/avatar",
  avatarLimiter,
  handler(async (req, res) => {
    const { url } = parse(query, req.query);
    const image = await cache.get(url, async () => softenBackground(await download(url)));
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.send(image);
  }),
);

export default router;
