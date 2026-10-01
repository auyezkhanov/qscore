import { expect, settled, test } from "./fixtures";

test.describe("match page", () => {
  test("finished match: every tab", async ({ page, ids }) => {
    await page.goto(`/match/${ids.finishedMatchId}`);
    await settled(page);

    // Header: score + teams + status
    await expect(page.getByText("Завершён").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Кайрат/ }).first()).toBeVisible();

    // Overview: timeline with goals + player of the match
    await expect(page.getByRole("tab", { name: "Обзор" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Конец матча")).toBeVisible();
    await expect(page.getByText("Игрок матча")).toBeVisible();

    // Lineups: pitch with ratings, coaches, officials; player sheet opens
    await page.getByRole("tab", { name: "Составы" }).click();
    await expect(page).toHaveURL(/tab=lineups/);
    await expect(page.getByText("Судейская бригада")).toBeVisible();
    const playerButtons = page.locator('button[aria-haspopup="dialog"]');
    expect(await playerButtons.count()).toBeGreaterThanOrEqual(22);
    await playerButtons.first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Открыть профиль" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Stats: possession + grouped rows
    await page.getByRole("tab", { name: "Статистика" }).click();
    await expect(page.getByText("Владение мячом")).toBeVisible();
    await expect(page.getByText("Удары в створ")).toBeVisible();

    // Table: league table with both clubs
    await page.getByRole("tab", { name: "Таблица" }).click();
    await expect(page.getByRole("link", { name: "Кайрат" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Тобыл" }).last()).toBeVisible();

    // Head-to-head
    await page.getByRole("tab", { name: "Личные встречи" }).click();
    await expect(page.getByText(/Победы|Команды ещё не встречались/).first()).toBeVisible();

    // Broadcast (this match has a stream link)
    const broadcast = page.getByRole("tab", { name: "Трансляция" });
    if (await broadcast.count()) {
      await broadcast.click();
      await expect(page.locator('iframe[src*="youtube.com/embed"]')).toBeVisible();
    }

    // Tab state survives a reload (URL-synced)
    await page.getByRole("tab", { name: "Составы" }).click();
    await page.reload();
    await expect(page.getByRole("tab", { name: "Составы" })).toHaveAttribute("aria-selected", "true");
  });

  test("scheduled match: preview, poll vote, follow bell", async ({ page, ids, signIn }) => {
    await signIn(page);
    await page.goto(`/match/${ids.scheduledMatchId}`);
    await settled(page);

    await expect(page.getByText("Форма команд")).toBeVisible();
    await expect(page.getByText("Следующие матчи")).toBeVisible();
    await expect(page.getByText("Кто победит?")).toBeVisible();

    // Vote for the draw → result bars with our choice
    await page.getByRole("button", { name: /Ничья/ }).first().click();
    await expect(page.getByText("Ваш выбор")).toBeVisible();
    await expect(page.getByText(/Голосов: \d+/)).toBeVisible();

    // Lineups tab before kick-off shows a friendly empty state
    await page.getByRole("tab", { name: "Составы" }).click();
    await expect(page.getByText(/Составы ещё не объявлены|Запасные/).first()).toBeVisible();
  });

  test("unknown match shows not-found", async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: "allow-api-error", description: "/api/matches/does-not-exist" });
    await page.goto("/match/does-not-exist");
    await expect(page.getByText("Матч не найден")).toBeVisible();
  });

  test("lineups on a phone @mobile", async ({ page, ids }) => {
    await page.goto(`/match/${ids.finishedMatchId}?tab=lineups`);
    await settled(page);
    await page.locator('button[aria-haspopup="dialog"]').nth(3).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // No horizontal scroll on a 412px screen.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
