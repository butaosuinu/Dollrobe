import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import { createDoll } from "./fixtures/factories";

test.describe("ドール管理", () => {
  test("空状態で CTA が表示される", async ({ authedPage }) => {
    await authedPage.goto("/dolls");

    await expect(authedPage.getByText("まだドールがいません")).toBeVisible();
    await expect(
      authedPage.getByText("最初のドールを登録してみましょう"),
    ).toBeVisible();
  });

  test("新規ドールを作成して一覧に表示される", async ({ authedPage }) => {
    await authedPage.goto("/dolls/new");

    const nameInput = authedPage.getByPlaceholder("ドールの名前");
    const submitBtn = authedPage.getByRole("button", { name: "登録する" });
    await expect(async () => {
      await nameInput.fill("テストドール花子");
      await expect(submitBtn).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });

    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    await authedPage.waitForURL(/\/dolls$/, { timeout: 15_000 });
    await expect(authedPage.getByText("テストドール花子")).toBeVisible();
  });

  test("ドール詳細を表示できる", async ({ authedPage, seed }) => {
    await seed({
      dolls: [
        createDoll({
          id: "d-detail",
          name: "詳細テストドール",
          bodySize: "MSD",
        }),
      ],
    });

    await authedPage.goto("/dolls");
    await authedPage.getByText("詳細テストドール").click();

    await authedPage.waitForURL(/\/dolls\/d-detail/);
    await expect(authedPage.getByText("詳細テストドール")).toBeVisible();
  });

  test("ドールを編集できる", async ({ authedPage, seed }) => {
    await seed({
      dolls: [
        createDoll({
          id: "d-edit",
          name: "編集前ドール",
        }),
      ],
    });

    await authedPage.goto("/dolls/d-edit");
    await authedPage.getByRole("button", { name: "編集" }).click();

    await authedPage.waitForURL(/\/dolls\/d-edit\/edit/);
    const nameInput = authedPage.getByPlaceholder("ドールの名前");
    await nameInput.waitFor({ state: "visible" });
    await nameInput.clear();
    await nameInput.fill("編集後ドール");

    await authedPage.getByRole("button", { name: "更新する" }).click();

    await authedPage.waitForURL(/\/dolls\/d-edit$/, { timeout: 15_000 });
    await expect(authedPage.getByText("編集後ドール")).toBeVisible();
  });

  test("ドールをアーカイブできる", async ({ authedPage, seed }) => {
    await seed({
      dolls: [
        createDoll({
          id: "d-archive",
          name: "アーカイブ対象ドール",
        }),
      ],
    });

    await authedPage.goto("/dolls/d-archive");
    await authedPage.getByRole("button", { name: "アーカイブ" }).click();

    await authedPage
      .locator("[role='dialog']")
      .getByRole("button", { name: "アーカイブ" })
      .click();

    await authedPage.waitForURL(/\/dolls$/, { timeout: 15_000 });
    await expect(
      authedPage.getByText("アーカイブ対象ドール"),
    ).not.toBeVisible();
  });
});
