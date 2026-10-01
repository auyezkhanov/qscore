import { api, expect, settled, test } from "./fixtures";

test.describe("app shell", () => {
  test("home: matches feed, date navigation, calendar and filters", async ({ page }) => {
    // A KPL match day with known results.
    await page.goto("/?date=2026-09-13");
    await settled(page);
    await expect(page.getByRole("link", { name: /Кайрат/ }).first()).toBeVisible();
    await expect(page.locator('a[href^="/match/"]').first()).toBeVisible();

    // Next / previous day update the URL.
    await page.getByRole("button", { name: "Следующий день" }).click();
    await expect(page).toHaveURL(/date=2026-09-14/);
    await page.getByRole("button", { name: "Предыдущий день" }).click();
    await expect(page).toHaveURL(/date=2026-09-13/);

    // Calendar popover opens and closes with Escape.
    await page.getByRole("button", { name: "Выбрать дату" }).first().click();
    await expect(page.getByRole("button", { name: "Следующий месяц" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Следующий месяц" })).toBeHidden();

    // Filter chips toggle (aria-pressed) without breaking the feed.
    const live = page.getByRole("button", { name: /^Live/ }).first();
    await live.click();
    await expect(live).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Нет матчей по выбранным фильтрам")).toBeVisible();
    await page.getByRole("button", { name: "Сбросить фильтры" }).click();
    await expect(live).toHaveAttribute("aria-pressed", "false");

    // A match row opens the match page.
    await page.locator('a[href^="/match/"]').first().click();
    await expect(page).toHaveURL(/\/match\//);
  });

  test("home: empty day points to the next match day", async ({ page }) => {
    await page.goto("/?date=2026-10-01");
    await settled(page);
    await expect(page.getByText("В этот день матчей нет")).toBeVisible();
    await page.getByRole("button", { name: /Перейти к этому дню/ }).click();
    await expect(page).toHaveURL(/date=2026-10-0[2-9]|date=2026-10-1/);
    await expect(page.locator('a[href^="/match/"]').first()).toBeVisible();
  });

  test("search finds teams and players", async ({ page }) => {
    await page.goto("/leagues");
    const box = page.getByRole("combobox", { name: "Поиск" });
    await box.fill("кай");
    await expect(page.getByRole("option", { name: /Кайрат/ }).first()).toBeVisible();
    await box.press("Enter");
    await expect(page).toHaveURL(/\/(team|player)\//);
  });

  test("settings: theme and language switch", async ({ page }) => {
    await page.goto("/leagues");
    await page.getByRole("button", { name: "Настройки" }).click();
    await page.getByRole("radio", { name: "Тёмная" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("radio", { name: "EN" }).click();
    await expect(page.getByRole("link", { name: "Leagues" }).first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    // Data is re-fetched in English, not just the UI chrome.
    await expect(page.getByText("Premier League").first()).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("link", { name: "Leagues" }).first()).toBeVisible();
  });

  test("auth: register, sign out, sign in, wrong password", async ({ page, request }) => {
    const email = `e2e-ui-${Date.now()}@example.com`;
    await page.goto("/leagues");
    await page.getByRole("button", { name: "Настройки" }).click();
    await page.getByRole("button", { name: "Создать аккаунт" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill("e2e-password-123");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Настройки" }).click();
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: "Выйти" }).click();

    await page.getByRole("button", { name: "Настройки" }).click();
    await page.getByRole("button", { name: "Войти" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Пароль").fill("wrong-password-1");
    await page.getByRole("dialog").getByRole("button", { name: "Войти" }).click();
    await expect(page.getByRole("alert")).toContainText("Неверный email или пароль");
    await page.getByLabel("Пароль").fill("e2e-password-123");
    await page.getByRole("dialog").getByRole("button", { name: "Войти" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Clean up the account.
    const token = await page.evaluate(() => localStorage.getItem("qscore:token"));
    expect(token).toBeTruthy();
    expect((await request.delete(api("/auth/me"), { headers: { Authorization: `Bearer ${token}` } })).ok()).toBeTruthy();
  });
  test.beforeEach(async ({}, testInfo) => {
    // The wrong-password attempt is an expected 401.
    if (testInfo.title.startsWith("auth")) testInfo.annotations.push({ type: "allow-api-error", description: "/api/auth/login" });
  });

  test("favourite a match from the feed", async ({ page }) => {
    await page.goto("/?date=2026-09-13");
    await settled(page);
    const star = page.getByRole("button", { name: "Добавить в избранное" }).first();
    await star.click();
    await expect(page.getByRole("button", { name: "Убрать из избранного" }).first()).toBeVisible();
    await page.getByRole("button", { name: /Избранное/ }).click();
    await expect(page.locator('a[href^="/match/"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Убрать из избранного" }).first().click();
  });

  test("404 page and unknown entities", async ({ page }) => {
    await page.goto("/definitely-not-a-page");
    await expect(page.getByText("Страница не найдена")).toBeVisible();
    await page.goto("/team/no-such-team");
    await expect(page.getByText("Команда не найдена")).toBeVisible();
  });
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.title.startsWith("404")) testInfo.annotations.push({ type: "allow-api-error", description: "/api/teams/no-such-team" });
  });

  test("about page", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "О проекте" })).toBeVisible();
    await expect(page.getByRole("link", { name: /kffleague\.kz/ }).first()).toBeVisible();
  });

  test("mobile bottom navigation @mobile", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav.fixed");
    for (const [label, url] of [
      ["Лиги", /\/leagues$/],
      ["Новости", /\/news$/],
      ["Трансферы", /\/transfers/],
      ["Прогнозы", /\/predictor/],
      ["Матчи", /\/$/],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(url);
    }
  });
});
