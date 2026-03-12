import Dexie from "dexie";
import type {
  Garment,
  StorageCase,
  StorageLocation,
  Coordinate,
  SyncQueueItem,
} from "@/types";

type DollWardrobeDB = Dexie & {
  readonly garments: Dexie.Table<Garment, string>;
  readonly storageCases: Dexie.Table<StorageCase, string>;
  readonly storageLocations: Dexie.Table<StorageLocation, string>;
  readonly coordinates: Dexie.Table<Coordinate, string>;
  readonly syncQueue: Dexie.Table<SyncQueueItem, number>;
};

const db = new Dexie("DollWardrobe") as DollWardrobeDB;

db.version(1).stores({
  garments: "id, userId, locationId, status, category",
  storageCases: "id, userId",
  storageLocations: "id, userId, caseId",
  coordinates: "id, userId",
  syncQueue: "++id, type, createdAt",
});

export { db };
export type { DollWardrobeDB };
