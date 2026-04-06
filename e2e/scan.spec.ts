import { expect } from "@playwright/test";
import { test } from "./fixtures/auth";
import {
  createGarment,
  createStorageCase,
  createStorageLocation,
} from "./fixtures/factories";
import { simulateScan, waitForScanReady } from "./helpers/scan-simulator";

test.describe("QR スキャン", () => {
  test("スキャンページが読み込まれる", async ({ authedPage }) => {
    await authedPage.goto("/scan");

    await expect(
      authedPage.getByRole("heading", { name: "スキャン" }),
    ).toBeVisible();
    await expect(
      authedPage.getByText(
        "場所のQRをスキャンして、収納場所を設定してください",
      ),
    ).toBeVisible();
  });

  test("場所 QR スキャンで場所名が表示される", async ({ authedPage, seed }) => {
    await seed({
      storageCases: [createStorageCase({ id: "case-scan" })],
      storageLocations: [
        createStorageLocation({
          id: "loc-scan",
          caseId: "case-scan",
          label: "B-2",
        }),
      ],
    });

    await authedPage.goto("/scan");
    await waitForScanReady(authedPage, 1);

    await simulateScan(authedPage, "dwg://l/loc-scan");

    await expect(authedPage.getByText("スキャン中の場所")).toBeVisible();
    await expect(authedPage.getByText("B-2").first()).toBeVisible();
  });

  test("服 QR スキャンで服名とカウントが表示される", async ({
    authedPage,
    seed,
  }) => {
    await seed({
      garments: [
        createGarment({
          id: "g-scan-1",
          name: "スキャンテストドレス",
          locationId: "loc-scan",
          lastScannedAt: Date.now(),
        }),
      ],
      storageCases: [createStorageCase({ id: "case-scan" })],
      storageLocations: [
        createStorageLocation({
          id: "loc-scan",
          caseId: "case-scan",
          label: "B-2",
        }),
      ],
    });

    await authedPage.goto("/scan");
    await waitForScanReady(authedPage, 1);

    await simulateScan(authedPage, "dwg://l/loc-scan");
    await expect(authedPage.getByText("B-2").first()).toBeVisible();

    await simulateScan(authedPage, "dwg://g/g-scan-1");
    await expect(authedPage.getByText("スキャンテストドレス")).toBeVisible();
    await expect(authedPage.getByText("1着をスキャンしました")).toBeVisible();
  });

  test("複数服スキャンでカウントが増加する", async ({ authedPage, seed }) => {
    await seed({
      garments: [
        createGarment({
          id: "g-multi-1",
          name: "マルチスキャン A",
          locationId: "loc-multi",
        }),
        createGarment({
          id: "g-multi-2",
          name: "マルチスキャン B",
          locationId: "loc-multi",
        }),
        createGarment({
          id: "g-multi-3",
          name: "マルチスキャン C",
          locationId: "loc-multi",
        }),
      ],
      storageCases: [createStorageCase({ id: "case-multi" })],
      storageLocations: [
        createStorageLocation({
          id: "loc-multi",
          caseId: "case-multi",
          label: "C-1",
        }),
      ],
    });

    await authedPage.goto("/scan");
    await waitForScanReady(authedPage, 1);

    await simulateScan(authedPage, "dwg://l/loc-multi");

    await simulateScan(authedPage, "dwg://g/g-multi-1");
    await expect(authedPage.getByText("1着をスキャンしました")).toBeVisible();

    await simulateScan(authedPage, "dwg://g/g-multi-2");
    await expect(authedPage.getByText("2着をスキャンしました")).toBeVisible();

    await simulateScan(authedPage, "dwg://g/g-multi-3");
    await expect(authedPage.getByText("3着をスキャンしました")).toBeVisible();
  });

  test("「全服確認済み」でセッションがリセットされる", async ({
    authedPage,
    seed,
  }) => {
    await seed({
      garments: [
        createGarment({
          id: "g-confirm",
          name: "確認テストドレス",
          locationId: "loc-confirm",
          lastScannedAt: Date.now(),
        }),
      ],
      storageCases: [createStorageCase({ id: "case-confirm" })],
      storageLocations: [
        createStorageLocation({
          id: "loc-confirm",
          caseId: "case-confirm",
          label: "D-1",
        }),
      ],
    });

    await authedPage.goto("/scan");
    await waitForScanReady(authedPage, 1);

    await simulateScan(authedPage, "dwg://l/loc-confirm");
    await simulateScan(authedPage, "dwg://g/g-confirm");
    await expect(authedPage.getByText("1着をスキャンしました")).toBeVisible();

    await authedPage
      .getByRole("button", {
        name: "この場所の全服を確認済みにする",
      })
      .click();

    await expect(
      authedPage.getByText(
        "場所のQRをスキャンして、収納場所を設定してください",
      ),
    ).toBeVisible();
  });
});
