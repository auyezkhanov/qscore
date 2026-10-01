import { api, expect, settled, test } from "./fixtures";

test.describe("league page", () => {
  test("table, matches, player stats, team stats", async ({ page }) => {
    await page.goto("/league/kpl");
    await settled(page);
    await expect(page.getByRole("heading", { name: "Премьер-лига" })).toBeVisible();

    // Table: 16 clubs, zone legend
    await expect(page.locator("tbody tr")).toHaveCount(16);
    await expect(page.getByText("Вылет")).toBeVisible();

    // Matches: round navigator keeps ?round in sync
    await page.getByRole("tab", { name: "Матчи" }).click();
    const next = page.getByRole("button", { name: "Следующий тур" });
    const prev = page.getByRole("button", { name: "Предыдущий тур" });
    await expect(page.locator('a[href^="/match/"]').first()).toBeVisible();
    if (await prev.isEnabled()) await prev.click();
    else await next.click();
    await expect(page).toHaveURL(/round=\d+/);
    await expect(page.locator('a[href^="/match/"]').first()).toBeVisible();

    // Player stats: categories and stats switch, ?stat in the URL
    await page.getByRole("tab", { name: "Статистика игроков" }).click();
    await expect(page.locator('a[href^="/player/"]').first()).toBeVisible();
    await page.getByRole("button", { name: "Вратари" }).click();
    await page.getByRole("button", { name: "Сейвы" }).click();
    await expect(page).toHaveURL(/stat=saves/);
    await expect(page.locator('a[href^="/player/"]').first()).toBeVisible();
    await page.getByRole("button", { name: "Главное" }).click();
    await page.getByRole("button", { name: "Рейтинг" }).click();
    await expect(page).toHaveURL(/stat=rating/);
    await expect(page.getByText(/достаточно матчей/)).toBeVisible();

    // Team stats: sortable
    await page.getByRole("tab", { name: "Статистика команд" }).click();
    await expect(page.locator('a[href^="/team/"]:visible').first()).toBeVisible();
    expect(await page.locator('a[href^="/team/"]:visible').count()).toBeGreaterThanOrEqual(16);
  });

  test("legacy tab links still work", async ({ page }) => {
    await page.goto("/league/kpl?tab=scorers");
    await settled(page);
    await expect(page.getByRole("tab", { name: "Статистика игроков" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('a[href^="/player/"]').first()).toBeVisible();
  });

  test("season archive", async ({ page }) => {
    await page.goto("/league/kpl");
    await settled(page);
    await page.getByLabel("Выбрать сезон").selectOption("2023");
    await expect(page).toHaveURL(/season=2023/);
    await expect(page.getByText("Архив")).toBeVisible();
    await settled(page);
    expect(await page.locator("tbody tr").count()).toBeGreaterThan(10);
    // Current-season-only tabs are hidden in the archive.
    await expect(page.getByRole("tab", { name: "Статистика игроков" })).toHaveCount(0);
    await page.getByRole("tab", { name: "Матчи" }).click();
    await expect(page.getByText(/\d\s?[-–:]\s?\d/).first()).toBeVisible();
  });

  test("calendar subscription popover", async ({ page }) => {
    await page.goto("/league/kpl");
    await page.getByRole("button", { name: "В календарь" }).click();
    const download = page.getByRole("link", { name: /Скачать \.ics/ });
    await expect(download).toBeVisible();
    await expect(page.getByRole("link", { name: /Подписаться/ })).toHaveAttribute("href", /^webcal:\/\/.+\/calendar\/leagues\/kpl\.ics/);
    const href = await download.getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    expect(await res.text()).toContain("BEGIN:VEVENT");
  });

  test("leagues list", async ({ page }) => {
    await page.goto("/leagues");
    await page.getByRole("link", { name: /Первая лига/ }).click();
    await expect(page).toHaveURL(/\/league\/birinshi-liga/);
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });
});

test.describe("team page", () => {
  test("every tab", async ({ page }) => {
    await page.goto("/team/kairat");
    await settled(page);
    await expect(page.getByRole("heading", { name: "Кайрат" })).toBeVisible();

    // Overview widgets
    await expect(page.getByText("Следующий матч")).toBeVisible();
    await expect(page.getByText("Сложность календаря")).toBeVisible();
    await expect(page.getByText("Главный тренер")).toBeVisible();
    await expect(page.getByText("Стоимость состава")).toBeVisible();

    await page.getByRole("tab", { name: "Таблица" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(16);

    await page.getByRole("tab", { name: "Матчи" }).click();
    await expect(page.getByText("Результаты")).toBeVisible();
    await expect(page.locator('a[href^="/match/"]').first()).toBeVisible();

    await page.getByRole("tab", { name: "Состав" }).click();
    await expect(page.getByText("Вратари")).toBeVisible();
    expect(await page.locator('a[href^="/player/"]').count()).toBeGreaterThan(15);

    await page.getByRole("tab", { name: "Трансферы" }).click();
    await expect(page.getByText(/Пришли|Трансферов не найдено/).first()).toBeVisible();
  });

  test("team calendar feed is valid", async ({ request }) => {
    const res = await request.get(api("/calendar/teams/kairat.ics?lang=en"));
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(body).toMatch(/SUMMARY:.*Kairat/);
  });
});
