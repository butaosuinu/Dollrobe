import { test, expect, type BrowserContext } from "@playwright/test";

const AUTHED_SESSION_RESPONSE = {
  user: {
    id: "lp-e2e-user",
    name: "LP E2E ユーザー",
    email: "lp-e2e@test.local",
    image: null,
    emailVerified: false,
    createdAt: new Date("2025-06-15T00:00:00Z").toISOString(),
    updatedAt: new Date("2025-06-15T00:00:00Z").toISOString(),
  },
};

const setupAuthedContext = async (context: BrowserContext): Promise<void> => {
  await context.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(AUTHED_SESSION_RESPONSE),
    }),
  );
  await context.route("**/trpc/sync.pull**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { data: null } }),
    }),
  );
  await context.route("**/trpc/sync.push**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { data: { ok: true } } }),
    }),
  );
};

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

  test("未認証で保護ルートにアクセスすると /signin に遷移", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("/signin に OAuth ボタンと email/password フォームが表示される", async ({
    page,
  }) => {
    await page.goto("/signin");
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /X.*Twitter|Twitter/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/メールアドレス|email/i)).toBeVisible();
    await expect(page.getByLabel(/パスワード|password/i)).toBeVisible();
  });

  test("CTA クリックで /signin?redirect=/dashboard に遷移する", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /無料で始める|始める/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fdashboard/);
  });

  test("認証済みで / にアクセスすると /dashboard へ遷移", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await setupAuthedContext(context);
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });

  test("認証済みで /signin?redirect=/dashboard にアクセスすると /dashboard へ遷移", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await setupAuthedContext(context);
    const page = await context.newPage();
    await page.goto("/signin?redirect=/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });
});
