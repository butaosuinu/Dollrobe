import { test, expect } from "@playwright/test";

test.describe("ランディングページ", () => {
  test("未認証で / にアクセスすると LP が表示される", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /.+/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /無料で始める|始める/ }).first(),
    ).toBeVisible();
  });

  test("未認証で保護ルートにアクセスすると /login?redirect=... へ遷移", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });

  test("/login に OAuth ボタンが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /X.*Twitter|Twitter/i }),
    ).toBeVisible();
  });

  test("CTA クリックで /login に遷移する", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /無料で始める|始める/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("認証済みで / にアクセスすると /dashboard へ遷移", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "e2e-fake-session",
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });

  test("認証済みで /login にアクセスすると /dashboard へ遷移", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "e2e-fake-session",
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });
});
