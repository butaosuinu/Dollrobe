import Dexie from "dexie";
import type { Garment, StorageCase, StorageLocation, Coordinate, SyncQueueItem } from "@/types";

class DollWardrobeDB extends Dexie {
  readonly garments!: Dexie.Table<Garment, string>;
  readonly storageCases!: Dexie.Table<StorageCase, string>;
  readonly storageLocations!: Dexie.Table<StorageLocation, string>;
  readonly coordinates!: Dexie.Table<Coordinate, string>;
  readonly syncQueue!: Dexie.Table<SyncQueueItem, number>;

  constructor() {
    super("DollWardrobe");
    this.version(1).stores({
      garments: "id, userId, locationId, status, category",
      storageCases: "id, userId",
      storageLocations: "id, userId, caseId",
      coordinates: "id, userId",
      syncQueue: "++id, type, createdAt",
    });
  }
}

const db = new DollWardrobeDB();

export { db };
export type { DollWardrobeDB };
