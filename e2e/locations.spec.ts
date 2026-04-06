import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import { createStorageCase, createStorageLocation } from "./fixtures/factories";

test.describe("収納場所管理", () => {
  test("空状態で CTA が表示される", async ({ authedPage }) => {
    await authedPage.goto("/locations");

    await expect(
      authedPage.getByText("まだ収納場所がありません"),
    ).toBeVisible();
    await expect(
      authedPage.getByText(
        "衣装ケースを追加して、服の収納場所を管理しましょう",
      ),
    ).toBeVisible();
  });

  test("収納ケースを作成してカード表示される", async ({ authedPage }) => {
    await authedPage.goto("/locations");

    await expect(async () => {
      await authedPage
        .getByRole("button", { name: "ケースを追加" })
        .first()
        .click();
      await expect(
        authedPage.getByRole("dialog", { name: "ケースを追加" }),
      ).toBeVisible();
    }).toPass({ timeout: 10_000 });

    const dialog = authedPage.getByRole("dialog", { name: "ケースを追加" });

    await dialog.getByLabel("ケース名").fill("テストケース");

    await dialog.getByRole("button", { name: "作成" }).click();

    await authedPage.reload();
    await authedPage.waitForLoadState("networkidle");
    await expect(authedPage.getByText("テストケース")).toBeVisible();
  });

  test("ケース詳細でグリッド表示を確認", async ({
    authedPage,
    seed,
  }, testInfo) => {
    testInfo.setTimeout(60_000);
    await seed({
      storageCases: [
        createStorageCase({
          id: "c-grid",
          name: "グリッドケース",
          rows: 2,
          cols: 3,
        }),
      ],
      storageLocations: [
        createStorageLocation({
          id: "l-1",
          caseId: "c-grid",
          row: 0,
          col: 0,
          label: "A-1",
        }),
        createStorageLocation({
          id: "l-2",
          caseId: "c-grid",
          row: 0,
          col: 1,
          label: "A-2",
        }),
      ],
    });

    await authedPage.goto("/locations/c-grid");
    await expect(authedPage.getByText("ケース詳細")).toBeVisible({
      timeout: 15_000,
    });
    await expect(authedPage.getByText("A-1")).toBeVisible();
    await expect(authedPage.getByText("A-2")).toBeVisible();
  });

  test("ケース名を編集できる", async ({ authedPage, seed }) => {
    await seed({
      storageCases: [createStorageCase({ id: "c-edit", name: "編集前ケース" })],
    });

    await authedPage.goto("/locations");
    await expect(authedPage.getByText("編集前ケース")).toBeVisible();

    await authedPage.getByRole("button", { name: "編集" }).click();

    const dialog = authedPage.getByRole("dialog", { name: "ケースを編集" });
    await dialog.waitFor({ state: "visible" });

    const nameInput = dialog.getByLabel("ケース名");
    await nameInput.clear();
    await nameInput.fill("編集後ケース");

    await dialog.getByRole("button", { name: "保存" }).click();

    await authedPage.reload();
    await authedPage.waitForLoadState("networkidle");
    await expect(authedPage.getByText("編集後ケース")).toBeVisible();
  });

  test("ケースを削除できる", async ({ authedPage, seed }) => {
    await seed({
      storageCases: [
        createStorageCase({ id: "c-delete", name: "削除対象ケース" }),
      ],
    });

    await authedPage.goto("/locations");
    await expect(authedPage.getByText("削除対象ケース")).toBeVisible();

    await authedPage.getByRole("button", { name: "削除" }).click();

    const confirmDialog = authedPage.getByRole("dialog", {
      name: "ケースを削除",
    });
    await confirmDialog.waitFor({ state: "visible" });

    await confirmDialog.getByRole("button", { name: "削除" }).click();

    await authedPage.reload();
    await authedPage.waitForLoadState("networkidle");
    await expect(authedPage.getByText("削除対象ケース")).not.toBeVisible();
  });
});
