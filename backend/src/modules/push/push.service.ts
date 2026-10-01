import webpush from "web-push";
import type { MatchStatus } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { createLogger } from "../../lib/logger";
import { localized, type Lang } from "../../lib/i18n";

const log = createLogger("push");
const VAPID_KEY = "vapid";

let publicKey: string | null = null;

/** Loads (or on first run generates and stores) the VAPID key pair. */
export async function initPush(): Promise<string> {
  if (publicKey) return publicKey;
  const stored = await prisma.appSetting.findUnique({ where: { key: VAPID_KEY } });
  let keys: { publicKey: string; privateKey: string };
  if (stored) keys = JSON.parse(stored.value);
  else {
    keys = webpush.generateVAPIDKeys();
    await prisma.appSetting.create({ data: { key: VAPID_KEY, value: JSON.stringify(keys) } });
    log.info("generated VAPID keys for web push");
  }
  webpush.setVapidDetails(env.PUBLIC_URL.startsWith("https://") ? env.PUBLIC_URL : "mailto:noreply@qscore.local", keys.publicKey, keys.privateKey);
  publicKey = keys.publicKey;
  return publicKey;
}

export type MatchNotice = "KICKOFF" | "GOAL" | "HALFTIME" | "FULLTIME";

/**
 * What changed between two snapshots of a match, if anything worth a push.
 * `previous` is null on the very first time we see a match — never notify then.
 */
export function detectNotice(
  previous: { status: MatchStatus; homeScore: number | null; awayScore: number | null } | null,
  current: { status: MatchStatus; homeScore: number | null; awayScore: number | null },
): MatchNotice | null {
  if (!previous) return null;
  const wasLive = previous.status === "LIVE" || previous.status === "HALFTIME";
  const isLive = current.status === "LIVE" || current.status === "HALFTIME";
  const goals = (s: { homeScore: number | null; awayScore: number | null }) => (s.homeScore ?? 0) + (s.awayScore ?? 0);

  if (previous.status === "SCHEDULED" && isLive) return goals(current) > 0 ? "GOAL" : "KICKOFF";
  if (wasLive && current.status === "FINISHED") return "FULLTIME";
  if (isLive && goals(current) > goals(previous)) return "GOAL";
  if (previous.status === "LIVE" && current.status === "HALFTIME") return "HALFTIME";
  return null;
}

const TITLES: Record<Lang, Record<MatchNotice, string>> = {
  ru: { KICKOFF: "Матч начался", GOAL: "⚽ Гол!", HALFTIME: "Перерыв", FULLTIME: "Финальный свисток" },
  en: { KICKOFF: "Kick-off", GOAL: "⚽ Goal!", HALFTIME: "Half time", FULLTIME: "Full time" },
};

/** Sends the push for one match state change to every device following either club or the match. */
export async function notifyMatch(matchId: string, notice: MatchNotice) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: { select: { name: true, nameEn: true } }, awayTeam: { select: { name: true, nameEn: true } } },
  });
  if (!match) return;
  const stateKey = `${notice} ${match.status} ${match.homeScore ?? "-"}-${match.awayScore ?? "-"}`;
  // Claim the notice atomically: only one process/run sends it (also across restarts).
  const claimed = await prisma.match.updateMany({
    where: { id: matchId, OR: [{ notifiedState: null }, { notifiedState: { not: stateKey } }] },
    data: { notifiedState: stateKey },
  });
  if (claimed.count === 0) return;

  await initPush();
  const subs = await prisma.pushSubscription.findMany({
    where: { OR: [{ teamIds: { hasSome: [match.homeTeamId, match.awayTeamId] } }, { matchIds: { has: matchId } }] },
  });
  if (subs.length === 0) return;

  const score = match.homeScore != null && match.awayScore != null ? `${match.homeScore}–${match.awayScore}` : "–";
  let sent = 0;
  const sendOne = async (sub: (typeof subs)[number]) => {
    const lang: Lang = sub.lang === "en" ? "en" : "ru";
    const home = localized(match.homeTeam.name, match.homeTeam.nameEn, lang);
    const away = localized(match.awayTeam.name, match.awayTeam.nameEn, lang);
    const payload = JSON.stringify({
      title: TITLES[lang][notice],
      body: `${home} ${score} ${away}${notice === "GOAL" && match.minute ? ` · ${match.minute}′` : ""}`,
      url: `/match/${match.id}`,
      tag: `match-${match.id}`,
    });
    try {
      // A timeout keeps one unresponsive endpoint from stalling the queue.
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 600, timeout: 5000 });
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410: the browser dropped the subscription — forget it.
      if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      else log.warn(`push to ${sub.id} failed`, err);
    }
  };
  for (let i = 0; i < subs.length; i += SEND_CONCURRENCY) await Promise.all(subs.slice(i, i + SEND_CONCURRENCY).map(sendOne));
  log.info(`${notice} for match ${matchId}: sent ${sent}/${subs.length}`);
}

const SEND_CONCURRENCY = 10;

// Notices are sent from a background queue so a sync never waits on push services.
let queue: Promise<void> = Promise.resolve();

export function enqueueNotice(matchId: string, notice: MatchNotice) {
  queue = queue.then(() => notifyMatch(matchId, notice)).catch((err) => log.warn(`push for ${matchId} failed`, err));
}

/** Resolves once queued notices are sent (graceful shutdown, tests). */
export function noticesFlushed(): Promise<void> {
  return queue;
}

// Only real browser push services; anything else could turn the server into a request proxy.
const PUSH_HOSTS_EXACT = new Set(["fcm.googleapis.com", "android.googleapis.com", "web.push.apple.com"]);
const PUSH_HOST_SUFFIXES = [".push.services.mozilla.com", ".notify.windows.com"];

export function isAllowedPushEndpoint(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return PUSH_HOSTS_EXACT.has(u.hostname) || PUSH_HOST_SUFFIXES.some((suffix) => u.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}
