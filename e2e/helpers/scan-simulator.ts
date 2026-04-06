import type { Page } from "@playwright/test";

export const waitForScanReady = async (
  page: Page,
  expectedLocations = 0,
): Promise<void> => {
  await page
    .getByText("場所のQRをスキャンして、収納場所を設定してください")
    .waitFor({
      state: "visible",
      timeout: 15_000,
    });

  if (expectedLocations > 0) {
    await page.waitForFunction(
      (expected) =>
        new Promise<boolean>((resolve) => {
          const req = indexedDB.open("DollWardrobe");
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction("storageLocations", "readonly");
            const countReq = tx.objectStore("storageLocations").count();
            countReq.onsuccess = () => {
              db.close();
              resolve(countReq.result >= expected);
            };
          };
        }),
      expectedLocations,
      { timeout: 15_000 },
    );
    await page.waitForTimeout(200);
  }
};

export const simulateScan = async (
  page: Page,
  qrData: string,
): Promise<void> => {
  await page.evaluate((data) => {
    document.dispatchEvent(new CustomEvent("dwg:scan", { detail: data }));
  }, qrData);
};
