import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

type Lang = "ru" | "en";

export type TestIds = {
  /** A finished KPL match with full details (Kairat's last-but-one game). */
  finishedMatchId: string;
  /** A scheduled KPL match. */
  scheduledMatchId: string;
  topPlayerSlug: string;
  goalkeeperSlug: string;
};

type Fixtures = {
  /** Language/theme seeded into localStorage before the app boots. */
  lang: Lang;
  theme: "light" | "dark";
  /** Fails the test on console errors, uncaught exceptions and failed API calls. */
  guard: void;
  ids: TestIds;
  /** Creates a throwaway account (deleted after the test) and signs the page in. */
  signIn: (page: Page) => Promise<{ email: string; token: string }>;
};

async function apiJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`/api${path}`);
  expect(res.ok(), `GET /api${path} -> ${res.status()}`).toBeTruthy();
  return (await res.json()) as T;
}

export const test = base.extend<Fixtures, { idsWorker: TestIds }>({
  lang: ["ru", { option: true }],
  theme: ["light", { option: true }],

  page: async ({ page, lang, theme }, use) => {
    await page.addInitScript(
      ([l, t]) => {
        // Only seed once so in-test language/theme switches survive reloads.
        if (!sessionStorage.getItem("e2e-seeded")) {
          localStorage.setItem("qscore:lang", l);
          localStorage.setItem("qscore:theme", t);
          sessionStorage.setItem("e2e-seeded", "1");
        }
      },
      [lang, theme] as const,
    );
    await use(page);
  },

  guard: [
    async ({ page }, use, testInfo) => {
      const problems: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        // Failed resource loads are reported via the response handler below.
        if (text.startsWith("Failed to load resource")) return;
        problems.push(`console.error: ${text}`);
      });
      page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
      page.on("response", (res) => {
        const url = res.url();
        if (!url.includes("/api/") || res.status() < 400) return;
        if (url.includes("/api/media/avatar")) return; // third-party photos may 404 upstream
        if (testInfo.annotations.some((a) => a.type === "allow-api-error" && url.includes(a.description ?? "\u0000"))) return;
        problems.push(`HTTP ${res.status()} ${res.request().method()} ${url}`);
      });
      await use();
      expect(problems, "browser problems during the test").toEqual([]);
    },
    { auto: true },
  ],

  idsWorker: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:15173" });
      const team = await apiJson<{ recentMatches: { id: string }[]; upcomingMatches: { id: string }[] }>(request, "/teams/kairat");
      const top = await apiJson<{ slug: string }[]>(request, "/leagues/kpl/top-players?stat=goals&limit=1");
      const keepers = await apiJson<{ slug: string }[]>(request, "/leagues/kpl/top-players?stat=saves&limit=1");
      await request.dispose();
      await use({
        finishedMatchId: team.recentMatches[1].id,
        scheduledMatchId: team.upcomingMatches[0].id,
        topPlayerSlug: top[0].slug,
        goalkeeperSlug: keepers[0].slug,
      });
    },
    { scope: "worker" },
  ],
  ids: async ({ idsWorker }, use) => use(idsWorker),

  signIn: async ({ request }, use) => {
    const created: string[] = [];
    await use(async (page) => {
      const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const res = await request.post("/api/auth/register", { data: { email, password: "e2e-password-123" } });
      expect(res.status()).toBe(201);
      const { token } = (await res.json()) as { token: string };
      created.push(token);
      await page.addInitScript((tok) => localStorage.setItem("qscore:token", tok), token);
      return { email, token };
    });
    // Clean up: account deletion cascades to favourites, predictions and votes.
    for (const token of created) await request.delete("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  },
});

export { expect };

/** Waits until no skeleton placeholders are left on the page. */
export async function settled(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
}
