import { test as base, expect } from "@playwright/test";
import { test as authedTest } from "./fixtures/auth";

base.describe("認証ガード", () => {
  base(
    "未認証で /garments を開くと /signin にリダイレクトされる",
    async ({ page, context }) => {
      await context.clearCookies();
      await page.route("**/api/auth/get-session", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "null",
        }),
      );

      await page.goto("/garments");

      await expect(page).toHaveURL(/\/signin/, { timeout: 10_000 });
    },
  );
});

authedTest.describe("ログアウト時 IndexedDB クリア", () => {
  authedTest(
    "ログアウト後に garments テーブルが空になる",
    async ({ authedPage }) => {
      await authedPage.route("**/api/auth/sign-out", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
        }),
      );

      await authedPage.goto("/");
      await authedPage.getByText("おかえりなさい").waitFor({
        state: "visible",
        timeout: 30_000,
      });

      await authedPage.evaluate(async () => {
        const req = indexedDB.open("DollWardrobe");
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const tx = db.transaction("garments", "readwrite");
        const store = tx.objectStore("garments");
        await new Promise<void>((resolve, reject) => {
          const r = store.add({
            id: "g-test-1",
            userId: "temp-user-001",
            name: "テスト服",
            category: "tops",
            dollSizes: ["SD"],
            colors: [],
            tags: [],
            confidenceDecayDays: 30,
            recentCheckoutCount: 0,
            status: "stored",
            lastScannedAt: 0,
            createdAt: 0,
            updatedAt: 0,
          });
          r.onsuccess = () => resolve();
          r.onerror = () => reject(r.error);
        });
        db.close();
      });

      const beforeCount = await authedPage.evaluate(async () => {
        const req = indexedDB.open("DollWardrobe");
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const count = await new Promise<number>((resolve, reject) => {
          const r = db.transaction("garments").objectStore("garments").count();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        db.close();
        return count;
      });
      expect(beforeCount).toBe(1);

      // signOut 後はセッションを未認証扱いにする
      await authedPage.unroute("**/api/auth/get-session");
      await authedPage.route("**/api/auth/get-session", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "null",
        }),
      );

      await authedPage.getByLabel("ログアウト").click();
      await authedPage
        .getByRole("button", { name: "ログアウト" })
        .last()
        .click();

      await expect(authedPage).toHaveURL(/\/signin/, { timeout: 10_000 });

      const afterCount = await authedPage.evaluate(async () => {
        const req = indexedDB.open("DollWardrobe");
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const count = await new Promise<number>((resolve, reject) => {
          const r = db.transaction("garments").objectStore("garments").count();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        db.close();
        return count;
      });
      expect(afterCount).toBe(0);
    },
  );
});
