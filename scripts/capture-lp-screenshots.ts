import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";
import { seedIndexedDB } from "../e2e/fixtures/seed";
import { buildSeedForScreenshots } from "./lp-screenshot-seed";

const LOCALES = ["ja", "en", "ko", "zh"] as const;
type Locale = (typeof LOCALES)[number];

const SCREENS = [
  { name: "dashboard", path: "/dashboard" },
  { name: "garments", path: "/garments" },
  { name: "locations", path: "/locations" },
  { name: "scan", path: "/scan" },
  { name: "digest", path: "/digest" },
] as const;

const BASE_URL = process.env.LP_SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../public/lp/screenshots");

const SESSION_RESPONSE = Object.freeze({
  user: {
    id: "lp-screenshot-user",
    name: "Preview",
    email: "preview@doll-wardrobe.local",
    image: null,
    emailVerified: false,
    createdAt: new Date("2025-06-15T00:00:00Z").toISOString(),
    updatedAt: new Date("2025-06-15T00:00:00Z").toISOString(),
  },
});

const mockAuth = async (page: Page) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SESSION_RESPONSE),
    });
  });
  await page.route("**/trpc/sync.pull**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { data: null } }),
    });
  });
  await page.route("**/trpc/sync.push**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { data: { ok: true } } }),
    });
  });
};

const captureLocale = async (locale: Locale): Promise<void> => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: locale === "ja" ? "ja-JP" : locale,
    });
    await context.addInitScript((loc) => {
      localStorage.setItem("dw-locale", loc);
    }, locale);

    const page = await context.newPage();
    await mockAuth(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");
    await seedIndexedDB(page, buildSeedForScreenshots());
    await page.reload();
    await page.waitForLoadState("networkidle");

    for (const screen of SCREENS) {
      await page.goto(`${BASE_URL}${screen.path}`);
      await page.waitForLoadState("networkidle");
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.waitForTimeout(400);

      const outPath = path.join(OUTPUT_DIR, locale, `${screen.name}.png`);
      await page.screenshot({
        path: outPath,
        fullPage: false,
        animations: "disabled",
        caret: "hide",
      });
      console.log(`[${locale}] captured ${screen.name} → ${outPath}`);
    }

    await context.close();
  } finally {
    await browser.close();
  }
};

const main = async (): Promise<void> => {
  await Promise.all(LOCALES.map(captureLocale));
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
