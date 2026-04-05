import { test, expect } from "./fixtures/index";
import {
  createGarment,
  createDoll,
  createStorageCase,
  createStorageLocation,
} from "./fixtures/factories";

test.describe("ダッシュボード", () => {
  test("認証済みユーザーがダッシュボードを表示できる", async ({
    authedPage,
  }) => {
    await authedPage.goto("/");

    await expect(authedPage.getByText("おかえりなさい")).toBeVisible();
  });

  test("統計情報が表示される", async ({ authedPage, seed }) => {
    await seed({
      garments: [
        createGarment({ id: "g-1", name: "ドレス A" }),
        createGarment({ id: "g-2", name: "ドレス B" }),
        createGarment({ id: "g-3", name: "ドレス C" }),
      ],
      dolls: [
        createDoll({ id: "d-1", name: "ドール A" }),
        createDoll({ id: "d-2", name: "ドール B" }),
      ],
      storageCases: [createStorageCase({ id: "c-1" })],
      storageLocations: [createStorageLocation({ id: "l-1", caseId: "c-1" })],
    });

    await authedPage.goto("/");
    await expect(authedPage.getByText("ステータス")).toBeVisible();
    await expect(authedPage.getByText("合計")).toBeVisible();
  });

  test("ナビゲーションで各ページに遷移できる", async ({ authedPage }) => {
    await authedPage.goto("/");

    await authedPage.getByRole("link", { name: "ワードローブ" }).click();
    await expect(authedPage).toHaveURL(/\/garments/);

    await authedPage.getByRole("link", { name: "ドール" }).click();
    await expect(authedPage).toHaveURL(/\/dolls/);

    await authedPage.getByRole("link", { name: "収納" }).click();
    await expect(authedPage).toHaveURL(/\/locations/);

    await authedPage.getByRole("link", { name: "スキャン" }).click();
    await expect(authedPage).toHaveURL(/\/scan/);

    await authedPage.getByRole("link", { name: "ホーム" }).click();
    await expect(authedPage).toHaveURL("/");
  });
});
