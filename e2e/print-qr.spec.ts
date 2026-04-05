import { test, expect } from "./fixtures/index";

test.describe("QR ラベル印刷ページ", () => {
  test("QR ラベルが URL パラメータで表示される", async ({ authedPage }) => {
    await authedPage.goto(
      "/print?type=garment&ids=g1&ids=g2&names=テストドレス&names=テストシャツ",
    );

    await expect(authedPage.getByText("QR ラベル印刷")).toBeVisible();
    await expect(authedPage.getByText("テストドレス")).toBeVisible();
    await expect(authedPage.getByText("テストシャツ")).toBeVisible();
  });

  test("印刷ボタンが表示される", async ({ authedPage }) => {
    await authedPage.goto("/print?type=garment&ids=g1&names=テスト");

    await expect(
      authedPage.getByRole("button", { name: "印刷" }),
    ).toBeVisible();
  });

  test("パラメータなしでエラーメッセージが表示される", async ({
    authedPage,
  }) => {
    await authedPage.goto("/print");

    await expect(
      authedPage.getByText("印刷する QR コードが選択されていません"),
    ).toBeVisible();
  });
});
