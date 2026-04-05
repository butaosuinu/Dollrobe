import type { Page } from "@playwright/test";
import type {
  Garment,
  Doll,
  StorageCase,
  StorageLocation,
} from "../../src/types/index";

export type SeedData = {
  readonly garments?: readonly Garment[];
  readonly dolls?: readonly Doll[];
  readonly storageCases?: readonly StorageCase[];
  readonly storageLocations?: readonly StorageLocation[];
};

export const seedIndexedDB = async (
  page: Page,
  data: SeedData,
): Promise<void> => {
  const payload: Record<string, readonly Record<string, unknown>[]> = {};

  if (data.garments !== undefined && data.garments.length > 0) {
    payload.garments = data.garments;
  }
  if (data.dolls !== undefined && data.dolls.length > 0) {
    payload.dolls = data.dolls;
  }
  if (data.storageCases !== undefined && data.storageCases.length > 0) {
    payload.storageCases = data.storageCases;
  }
  if (data.storageLocations !== undefined && data.storageLocations.length > 0) {
    payload.storageLocations = data.storageLocations;
  }

  await page.evaluate(async (seedPayload) => {
    await window.__e2eSeedDb?.(seedPayload);
  }, payload);
};
