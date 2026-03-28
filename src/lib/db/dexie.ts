import Dexie from "dexie";
import { STORAGE_CASE_TYPE } from "@/lib/constants";
import type {
  Doll,
  Garment,
  StorageCase,
  StorageLocation,
  Coordinate,
  SyncQueueItem,
} from "@/types";

class DollWardrobeDB extends Dexie {
  readonly garments!: Dexie.Table<Garment, string>;
  readonly storageCases!: Dexie.Table<StorageCase, string>;
  readonly storageLocations!: Dexie.Table<StorageLocation, string>;
  readonly coordinates!: Dexie.Table<Coordinate, string>;
  readonly syncQueue!: Dexie.Table<SyncQueueItem, number>;
  readonly dolls!: Dexie.Table<Doll, string>;

  constructor() {
    super("DollWardrobe");
    this.version(1).stores({
      garments: "id, userId, locationId, status, category",
      storageCases: "id, userId",
      storageLocations: "id, userId, caseId",
      coordinates: "id, userId",
      syncQueue: "++id, type, createdAt",
    });
    this.version(2)
      .stores({
        garments: "id, userId, locationId, status, category",
        storageCases: "id, userId",
        storageLocations: "id, userId, caseId",
        coordinates: "id, userId",
        syncQueue: "++id, type, createdAt",
      })
      .upgrade(async (tx) => {
        const table = tx.table("garments");
        await table
          .toCollection()
          .filter((g) => g.dollSize === "1/3")
          .modify({ dollSize: "SD" });
        await table
          .toCollection()
          .filter((g) => g.dollSize === "1/6")
          .modify({ dollSize: "other" });
      });
    this.version(3)
      .stores({
        garments: "id, userId, locationId, status, category",
        storageCases: "id, userId",
        storageLocations: "id, userId, caseId",
        coordinates: "id, userId",
        syncQueue: "++id, type, createdAt",
        dolls: "id, userId, bodySize",
      })
      .upgrade(async (tx) => {
        const table = tx.table("garments");
        /* eslint-disable functional/no-conditional-statements, no-param-reassign, functional/immutable-data -- Dexie modify callback requires in-place mutation */
        await table.toCollection().modify((g: Record<string, unknown>) => {
          if (g.dollSize !== undefined && g.dollSizes === undefined) {
            g.dollSizes = [g.dollSize];
            delete g.dollSize;
          }
        });
        /* eslint-enable functional/no-conditional-statements, no-param-reassign, functional/immutable-data */
      });
    this.version(4)
      .stores({
        garments: "id, userId, locationId, status, category",
        storageCases: "id, userId",
        storageLocations: "id, userId, caseId",
        coordinates: "id, userId",
        syncQueue: "++id, type, createdAt",
        dolls: "id, userId, bodySize",
      })
      .upgrade(async (tx) => {
        const syncTable = tx.table("syncQueue");
        /* eslint-disable functional/immutable-data -- Dexie modify callback requires in-place mutation */
        await syncTable
          .toCollection()
          .filter(
            (item: Record<string, unknown>) =>
              (item.type === "garment:create" ||
                item.type === "garment:update") &&
              typeof (item.payload as Record<string, unknown> | undefined)
                ?.dollSize === "string",
          )
          .modify((item: Record<string, unknown>) => {
            const payload = item.payload as Record<string, unknown>;
            payload.dollSizes = [payload.dollSize];
            delete payload.dollSize;
          });
        /* eslint-enable functional/immutable-data */
      });
    this.version(5)
      .stores({
        garments: "id, userId, locationId, status, category",
        storageCases: "id, userId",
        storageLocations: "id, userId, caseId",
        coordinates: "id, userId",
        syncQueue: "++id, type, createdAt",
        dolls: "id, userId, bodySize",
      })
      .upgrade(async (tx) => {
        const casesTable = tx.table("storageCases");
        /* eslint-disable functional/no-conditional-statements, no-param-reassign, @typescript-eslint/prefer-destructuring -- Dexie modify callback requires in-place mutation */
        await casesTable.toCollection().modify((c: Record<string, unknown>) => {
          if (c.type === undefined) {
            c.type = STORAGE_CASE_TYPE.GRID;
          }
        });
        /* eslint-enable functional/no-conditional-statements, no-param-reassign, @typescript-eslint/prefer-destructuring */
      });
    this.version(6).stores({
      garments: "id, userId, locationId, status, category, archivedAt",
      storageCases: "id, userId",
      storageLocations: "id, userId, caseId",
      coordinates: "id, userId",
      syncQueue: "++id, type, createdAt",
      dolls: "id, userId, bodySize",
    });
    this.version(7).stores({
      garments: "id, userId, locationId, status, category, archivedAt",
      storageCases: "id, userId",
      storageLocations: "id, userId, caseId",
      coordinates: "id, userId",
      syncQueue: "++id, type, createdAt",
      dolls: "id, userId, bodySize, archivedAt",
    });
  }
}

const db = new DollWardrobeDB();

export { db };
export type { DollWardrobeDB };
