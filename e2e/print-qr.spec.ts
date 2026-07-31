import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import { createGarment } from "./fixtures/factories";

test.describe("QR ラベル印刷ページ", () => {
  test("QR ラベルが URL パラメータで表示される", async ({
    authedPage,
    seed,
  }) => {
    await seed({
      garments: [
        createGarment({ id: "g1", name: "テストドレス" }),
        createGarment({ id: "g2", name: "テストシャツ" }),
      ],
    });

    await authedPage.goto(
      "/print?type=garment&ids=g1&ids=g2&names=テストドレス&names=テストシャツ",
    );

    await expect(authedPage.getByText("QR ラベル印刷")).toBeVisible();
    await expect(authedPage.getByText("テストドレス")).toBeVisible();
    await expect(authedPage.getByText("テストシャツ")).toBeVisible();
  });

  test("印刷ボタンが表示される", async ({ authedPage, seed }) => {
    await seed({ garments: [createGarment({ id: "g1", name: "テスト" })] });

    await authedPage.goto("/print?type=garment&ids=g1&names=テスト");

    await expect(
      authedPage.getByRole("button", { name: "印刷" }),
    ).toBeVisible();
  });

  test("存在しない ID は QR 化されず警告が表示される", async ({
    authedPage,
    seed,
  }) => {
    await seed({
      garments: [createGarment({ id: "g1", name: "テストドレス" })],
    });

    await authedPage.goto("/print?type=garment&ids=ghost&names=幻のドレス");

    await expect(
      authedPage.getByText(
        "登録されていない ID のため印刷対象から除外しました（ghost）",
      ),
    ).toBeVisible();
    await expect(authedPage.getByText("幻のドレス")).toHaveCount(0);
    await expect(
      authedPage.getByRole("button", { name: "印刷" }),
    ).toBeDisabled();
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
