import type { Page } from "@playwright/test";

export const waitForScanReady = async (
  page: Page,
  expectedLocations: number,
): Promise<void> => {
  await page.waitForFunction(
    (expected) =>
      typeof window.__e2eSimulateScan === "function" &&
      (window.__e2eScanLocationsLoaded ?? 0) >= expected,
    expectedLocations,
    { timeout: 15_000 },
  );
};

export const simulateScan = async (
  page: Page,
  qrData: string,
): Promise<void> => {
  await page.waitForFunction(
    () => typeof window.__e2eSimulateScan === "function",
    undefined,
    { timeout: 10_000 },
  );
  await page.evaluate((data) => window.__e2eSimulateScan?.(data), qrData);
};
