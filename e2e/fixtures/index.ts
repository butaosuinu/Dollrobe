import { test as base, type Page } from "@playwright/test";
import { seedIndexedDB, type SeedData } from "./seed";

export { expect } from "@playwright/test";

const SESSION_RESPONSE = {
  user: {
    id: "temp-user-001",
    name: "E2E テストユーザー",
    email: "e2e@test.local",
    image: null,
    emailVerified: false,
    createdAt: new Date("2025-06-15T00:00:00Z").toISOString(),
    updatedAt: new Date("2025-06-15T00:00:00Z").toISOString(),
  },
};

type TestFixtures = {
  readonly authedPage: Page;
  readonly seed: (data: SeedData) => Promise<void>;
};

export const test = base.extend<TestFixtures>({
  authedPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (
              node instanceof HTMLElement &&
              node.tagName.toLowerCase() === "nextjs-portal"
            ) {
              node.remove();
            }
          }
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    });

    await page.route("**/api/auth/get-session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SESSION_RESPONSE),
      }),
    );

    await page.route("**/trpc/sync.pull**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { data: null } }),
      }),
    );

    await page.route("**/trpc/sync.push**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { data: { ok: true } } }),
      }),
    );

    await use(page);
  },

  seed: async ({ authedPage }, use) => {
    await authedPage.goto("/");
    await authedPage.getByText("おかえりなさい").waitFor({
      state: "visible",
      timeout: 30_000,
    });

    const seedFn = async (data: SeedData): Promise<void> => {
      await seedIndexedDB(authedPage, data);
    };

    await use(seedFn);
  },
});

export type { SeedData };
