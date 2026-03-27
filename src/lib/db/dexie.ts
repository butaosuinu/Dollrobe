import Dexie from "dexie";
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
  }
}

const db = new DollWardrobeDB();

export { db };
export type { DollWardrobeDB };
