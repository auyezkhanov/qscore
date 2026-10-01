import { expect, settled, test } from "./fixtures";

test.describe("player page", () => {
  test("outfield player: hero, rating, charts, match log, career", async ({ page, ids }) => {
    await page.goto(`/player/${ids.topPlayerSlug}`);
    await settled(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Средний рейтинг|Рейтинг/).first()).toBeVisible();

    // Goals / rating chart switch
    await page.getByRole("radio", { name: "Рейтинг" }).first().click();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();

    // Match log row expands into per-match stats
    const row = page.getByRole("button", { expanded: false }).filter({ hasText: /\d[:-]\d/ }).first();
    await row.click();
    await expect(page.getByRole("button", { expanded: true }).first()).toBeVisible();

    await expect(page.getByText("Карьера").first()).toBeVisible();
  });

  test("goalkeeper shows saves and clean sheets", async ({ page, ids }) => {
    await page.goto(`/player/${ids.goalkeeperSlug}`);
    await settled(page);
    await expect(page.getByText(/Сухие матчи/).first()).toBeVisible();
  });
});

test.describe("news & transfers", () => {
  test("news list, league filter and article", async ({ page }) => {
    await page.goto("/news");
    await settled(page);
    await page.getByRole("radio", { name: "Премьер-лига" }).click();
    await expect(page).toHaveURL(/tab=kpl/);
    await settled(page);
    await page.locator('a[href^="/news/"]').first().click();
    await expect(page).toHaveURL(/\/news\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /Все новости/ }).click();
    await expect(page).toHaveURL(/\/news$/);
  });

  test("transfers: filters, sorting by fee, paging", async ({ page }) => {
    await page.goto("/transfers");
    await settled(page);
    await expect(page.getByText(/Найдено: \d+/)).toBeVisible();
    await page.getByRole("radio", { name: "По сумме" }).click();
    await expect(page).toHaveURL(/sort=fee/);
    await settled(page);
    // The first row of the fee ranking has a paid fee badge (€).
    await expect(page.getByText(/€/).first()).toBeVisible();

    await page.getByRole("button", { name: /Нападающий/ }).click();
    await expect(page).toHaveURL(/pos=FW/);
    await settled(page);
    await page.getByRole("button", { name: "Сбросить" }).click();
    await expect(page).not.toHaveURL(/pos=/);

    await page.getByRole("radio", { name: "Первая лига" }).click();
    await expect(page).toHaveURL(/league=birinshi-liga/);
    await settled(page);
    await expect(page.getByText(/Найдено: \d+/)).toBeVisible();
  });
});

test.describe("tv schedule", () => {
  test("lists upcoming matches grouped by day", async ({ page }) => {
    await page.goto("/tv");
    await settled(page);
    await expect(page.getByRole("heading", { name: "Расписание трансляций" })).toBeVisible();
    await expect(page.locator('a[href^="/match/"]').first()).toBeVisible();
  });
});

test.describe("predictor", () => {
  test("signed out: browse and get a sign-in prompt", async ({ page }) => {
    await page.goto("/predictor");
    await settled(page);
    await expect(page.getByText("Прогнозист").first()).toBeVisible();
    await page.getByRole("tab", { name: "Таблица" }).click();
    await expect(page).toHaveURL(/tab=leaderboard/);
  });

  test("signed in: predict a score, it persists, then clear it", async ({ page, signIn }) => {
    await signIn(page);
    await page.goto("/predictor");
    await settled(page);

    // Anchor on the score steppers: they stay put while the Save button changes state.
    const card = page.locator("article").filter({ has: page.getByRole("button", { name: /^Больше голов/ }) }).first();
    const plus = card.getByRole("button", { name: /^Больше голов/ });
    await plus.first().click();
    await plus.first().click();
    await plus.last().click();
    await card.getByRole("button", { name: "Сохранить" }).click();
    await expect(card.getByText("Сохранено")).toBeVisible();

    await page.reload();
    await settled(page);
    await expect(page.getByText(/Спрогнозировано 1 из \d+/)).toBeVisible();

    const saved = page.locator("article").filter({ has: page.getByRole("button", { name: "Удалить" }) }).first();
    await saved.getByRole("button", { name: "Удалить" }).click();
    await expect(page.getByText(/Спрогнозировано 0 из \d+/)).toBeVisible();
  });
});

test.describe("english UI", () => {
  test.use({ lang: "en", theme: "dark" });
  test("key pages render in English", async ({ page, ids }) => {
    await page.goto("/league/kpl");
    await expect(page.getByRole("heading", { name: "Premier League" })).toBeVisible();
    await page.goto(`/match/${ids.finishedMatchId}`);
    await expect(page.getByRole("tab", { name: "Lineups" })).toBeVisible();
    await expect(page.getByText("Kairat").first()).toBeVisible();
    await page.goto("/predictor");
    await expect(page.getByText("Predictor").first()).toBeVisible();
  });
});
