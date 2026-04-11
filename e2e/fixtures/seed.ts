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

const MAX_DB_OPEN_ATTEMPTS = 30;
const DB_OPEN_RETRY_INTERVAL_MS = 100;

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

  await page.evaluate(
    async ([seedPayload, maxAttempts, retryInterval]) => {
      const storeNames = Object.keys(seedPayload);

      const openDbWithStores = async (): Promise<IDBDatabase> => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("DollWardrobe");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          const hasAllStores = storeNames.every((name) =>
            db.objectStoreNames.contains(name),
          );

          if (hasAllStores) return db;

          db.close();
          await new Promise((r) => setTimeout(r, retryInterval));
        }
        throw new Error(
          `IndexedDB stores not found after ${maxAttempts} attempts: ${storeNames.join(", ")}`,
        );
      };

      const db = await openDbWithStores();

      const putRecords = (
        storeName: string,
        records: Record<string, unknown>[],
      ): Promise<void> =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          records.forEach((record) => store.put(record));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

      await Promise.all(
        Object.entries(seedPayload)
          .filter(([, records]) => records.length > 0)
          .map(([storeName, records]) => putRecords(storeName, [...records])),
      );

      db.close();
    },
    [payload, MAX_DB_OPEN_ATTEMPTS, DB_OPEN_RETRY_INTERVAL_MS] as const,
  );
};
