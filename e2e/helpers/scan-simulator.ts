import type { Page } from "@playwright/test";
import QRCode from "qrcode";

const MODULE_SIZE = 4;

const generateQrPixels = (
  data: string,
): { width: number; height: number; data: number[] } => {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const margin = MODULE_SIZE * 2;
  const fullSize = size * MODULE_SIZE + margin * 2;
  const pixels: number[] = [];

  for (let y = 0; y < fullSize; y++) {
    for (let x = 0; x < fullSize; x++) {
      const mx = Math.floor((x - margin) / MODULE_SIZE);
      const my = Math.floor((y - margin) / MODULE_SIZE);
      const isDark =
        mx >= 0 &&
        mx < size &&
        my >= 0 &&
        my < size &&
        qr.modules.get(my, mx) === 1;
      const color = isDark ? 0 : 255;
      pixels.push(color, color, color, 255);
    }
  }

  return { width: fullSize, height: fullSize, data: pixels };
};

export const waitForScanReady = async (
  page: Page,
  expectedLocations = 0,
): Promise<void> => {
  await page
    .getByText("場所のQRをスキャンして、収納場所を設定してください")
    .waitFor({ state: "visible", timeout: 15_000 });

  await page.waitForFunction(() => document.querySelector("video") !== null, {
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
    await page.waitForTimeout(300);
  }
};

const SCAN_RETRY_COUNT = 3;
const SCAN_RETRY_INTERVAL_MS = 300;

export const simulateScan = async (
  page: Page,
  qrData: string,
): Promise<void> => {
  const pixels = generateQrPixels(qrData);

  const inject = () =>
    page.evaluate((px: { width: number; height: number; data: number[] }) => {
      (
        window as unknown as {
          __setPendingQrScan: (px: {
            width: number;
            height: number;
            data: number[];
          }) => void;
        }
      ).__setPendingQrScan(px);
    }, pixels);

  for (let i = 0; i < SCAN_RETRY_COUNT; i++) {
    await inject();
    await page.waitForTimeout(SCAN_RETRY_INTERVAL_MS);
  }
};
