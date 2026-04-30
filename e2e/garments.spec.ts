import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import {
  createGarment,
  createStorageCase,
  createStorageLocation,
} from "./fixtures/factories";

test.describe("ワードローブ（服管理）", () => {
  test("空状態で CTA が表示される", async ({ authedPage }) => {
    await authedPage.goto("/garments");

    await expect(authedPage.getByText("まだ服がありません")).toBeVisible();
    await expect(
      authedPage.getByText("最初のドール服を登録してみましょう"),
    ).toBeVisible();
  });

  test("新規服を作成して一覧に表示される", async ({ authedPage }) => {
    await authedPage.goto("/garments");
    const ctaBtn = authedPage.getByRole("button", { name: "服を登録" });
    await ctaBtn.waitFor({ state: "visible", timeout: 15_000 });
    await expect(async () => {
      await ctaBtn.click();
      await authedPage.waitForURL(/\/garments\/new/, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });

    const nameInput = authedPage.getByPlaceholder("ドール服の名前");
    const submitBtn = authedPage.getByRole("button", { name: "登録する" });
    await expect(async () => {
      await nameInput.fill("テストワンピース");
      await expect(submitBtn).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });

    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    await authedPage.waitForURL(/\/garments$/, { timeout: 15_000 });
    await expect(authedPage.getByText("テストワンピース")).toBeVisible();
  });

  test("服詳細を表示できる", async ({ authedPage, seed }) => {
    await seed({
      garments: [
        createGarment({
          id: "g-detail",
          name: "詳細テストドレス",
          category: "dress",
          locationId: "loc-1",
        }),
      ],
      storageCases: [createStorageCase({ id: "case-1" })],
      storageLocations: [
        createStorageLocation({ id: "loc-1", caseId: "case-1" }),
      ],
    });

    await authedPage.goto("/garments");
    await authedPage.getByText("詳細テストドレス").click();

    await authedPage.waitForURL(/\/garments\/g-detail/);
    await expect(authedPage.getByText("詳細テストドレス")).toBeVisible();
  });

  test("服を編集できる", async ({ authedPage, seed }) => {
    await seed({
      garments: [
        createGarment({
          id: "g-edit",
          name: "編集前ドレス",
        }),
      ],
    });

    await authedPage.goto("/garments/g-edit");
    await authedPage.getByRole("button", { name: "編集" }).click();

    await authedPage.waitForURL(/\/garments\/g-edit\/edit/);
    const nameInput = authedPage.getByPlaceholder("ドール服の名前");
    await nameInput.waitFor({ state: "visible" });
    await nameInput.clear();
    await nameInput.fill("編集後ドレス");

    await authedPage.getByRole("button", { name: "更新する" }).click();

    await authedPage.waitForURL(/\/garments\/g-edit$/, { timeout: 15_000 });
    await expect(authedPage.getByText("編集後ドレス")).toBeVisible();
  });

  test("服をアーカイブできる", async ({ authedPage, seed }) => {
    await seed({
      garments: [
        createGarment({
          id: "g-archive",
          name: "アーカイブ対象ドレス",
        }),
      ],
    });

    await authedPage.goto("/garments/g-archive");
    await authedPage.getByRole("button", { name: "アーカイブ" }).click();

    await authedPage
      .locator("[role='dialog']")
      .getByRole("button", { name: "アーカイブ" })
      .click();

    await authedPage.waitForURL(/\/garments$/, { timeout: 15_000 });
    await expect(
      authedPage.getByText("アーカイブ対象ドレス"),
    ).not.toBeVisible();
  });
});
