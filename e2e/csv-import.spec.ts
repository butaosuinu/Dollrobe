import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";

test.describe("CSV インポート", () => {
  test("ドロップゾーンが表示される", async ({ authedPage }) => {
    await authedPage.goto("/garments/import");

    await expect(
      authedPage.getByText("CSVファイルをドラッグ&ドロップ"),
    ).toBeVisible();
  });

  test("有効な CSV アップロードでプレビューテーブルが表示される", async ({
    authedPage,
  }) => {
    await authedPage.goto("/garments/import");

    const csvContent = [
      "name,category,dollSize",
      "テストシャツ,tops,SD",
      "テストスカート,bottoms,MSD",
    ].join("\n");

    const fileInput = authedPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent, "utf-8"),
    });

    await expect(authedPage.getByText("プレビュー")).toBeVisible();
    await expect(authedPage.getByText("テストシャツ")).toBeVisible();
    await expect(authedPage.getByText("テストスカート")).toBeVisible();
  });

  test("インポート実行で完了メッセージが表示される", async ({ authedPage }) => {
    await authedPage.goto("/garments/import");

    const csvContent = [
      "name,category,dollSize",
      "インポートテスト服,tops,SD",
    ].join("\n");

    const fileInput = authedPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent, "utf-8"),
    });

    await expect(authedPage.getByText("プレビュー")).toBeVisible();

    await authedPage.getByRole("button", { name: "インポート" }).click();

    await expect(
      authedPage.getByRole("heading", { name: "インポート完了" }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
