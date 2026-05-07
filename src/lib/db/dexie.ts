import Dexie from "dexie";
import { STORAGE_CASE_TYPE, SYNC_ACTION_TYPE } from "@/lib/constants";
import type {
  Doll,
  Garment,
  StorageCase,
  StorageLocation,
  Coordinate,
  SyncQueueItem,
} from "@/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const DEFAULT_DB_NAME = "DollWardrobe";

export class DollWardrobeDB extends Dexie {
  readonly garments!: Dexie.Table<Garment, string>;
  readonly storageCases!: Dexie.Table<StorageCase, string>;
  readonly storageLocations!: Dexie.Table<StorageLocation, string>;
  readonly coordinates!: Dexie.Table<Coordinate, string>;
  readonly syncQueue!: Dexie.Table<SyncQueueItem, number>;
  readonly dolls!: Dexie.Table<Doll, string>;

  constructor(dbName: string = DEFAULT_DB_NAME) {
    super(dbName);
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
        /* eslint-disable no-param-reassign, functional/immutable-data -- Dexie modify callback requires in-place mutation */
        await table.toCollection().modify((g: Record<string, unknown>) => {
          if (g.dollSize === undefined || g.dollSizes !== undefined) return;
          g.dollSizes = [g.dollSize];
          delete g.dollSize;
        });
        /* eslint-enable no-param-reassign, functional/immutable-data */
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
        /* eslint-disable functional/immutable-data, @typescript-eslint/prefer-destructuring -- Dexie modify callback requires in-place mutation; destructuring loses type guard narrowing */
        await syncTable
          .toCollection()
          .filter((item: Record<string, unknown>) => {
            if (
              item.type !== SYNC_ACTION_TYPE.GARMENT_CREATE &&
              item.type !== SYNC_ACTION_TYPE.GARMENT_UPDATE
            ) {
              return false;
            }
            if (!isRecord(item.payload)) return false;
            const payload = item.payload;
            return typeof payload.dollSize === "string";
          })
          .modify((item: Record<string, unknown>) => {
            if (!isRecord(item.payload)) return;
            const payload = item.payload;
            payload.dollSizes = [payload.dollSize];
            delete payload.dollSize;
          });
        /* eslint-enable functional/immutable-data, @typescript-eslint/prefer-destructuring */
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
        /* eslint-disable no-param-reassign, @typescript-eslint/prefer-destructuring -- Dexie modify callback requires in-place mutation */
        await casesTable.toCollection().modify((c: Record<string, unknown>) => {
          if (c.type !== undefined) return;
          c.type = STORAGE_CASE_TYPE.GRID;
        });
        /* eslint-enable no-param-reassign, @typescript-eslint/prefer-destructuring */
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
    this.version(8)
      .stores({
        garments: "id, userId, locationId, status, category, archivedAt",
        storageCases: "id, userId",
        storageLocations: "id, userId, caseId",
        coordinates: "id, userId",
        syncQueue: "++id, type, createdAt",
        dolls: "id, userId, bodySize, archivedAt",
      })
      .upgrade(async (tx) => {
        const DOLL_SIZE_MIGRATION: Record<string, string> = {
          DD: "DD_M",
          MDD: "MDD_M",
        };
        const replaceDollSize = (size: string): string =>
          DOLL_SIZE_MIGRATION[size] ?? size;

        const garmentsTable = tx.table("garments");
        /* eslint-disable no-param-reassign, @typescript-eslint/prefer-destructuring, functional/no-conditional-statements -- Dexie modify callback requires in-place mutation; destructuring loses type guard narrowing; payload may carry dollSizes AND bodySize so cannot early-return after the first guard */
        await garmentsTable
          .toCollection()
          .modify((g: Record<string, unknown>) => {
            if (!Array.isArray(g.dollSizes)) return;
            g.dollSizes = g.dollSizes
              .filter((s: unknown): s is string => typeof s === "string")
              .map(replaceDollSize);
          });

        const dollsTable = tx.table("dolls");
        await dollsTable.toCollection().modify((d: Record<string, unknown>) => {
          if (typeof d.bodySize !== "string") return;
          d.bodySize = replaceDollSize(d.bodySize);
        });

        const syncTable = tx.table("syncQueue");
        await syncTable
          .toCollection()
          .filter(
            (item: Record<string, unknown>) =>
              item.type === SYNC_ACTION_TYPE.GARMENT_CREATE ||
              item.type === SYNC_ACTION_TYPE.GARMENT_UPDATE ||
              item.type === SYNC_ACTION_TYPE.DOLL_CREATE ||
              item.type === SYNC_ACTION_TYPE.DOLL_UPDATE,
          )
          .modify((item: Record<string, unknown>) => {
            if (!isRecord(item.payload)) return;
            const payload = item.payload;
            if (Array.isArray(payload.dollSizes)) {
              payload.dollSizes = payload.dollSizes
                .filter((s: unknown): s is string => typeof s === "string")
                .map(replaceDollSize);
            }
            if (typeof payload.bodySize === "string") {
              payload.bodySize = replaceDollSize(payload.bodySize);
            }
          });
        /* eslint-enable no-param-reassign, @typescript-eslint/prefer-destructuring, functional/no-conditional-statements */
      });
    this.version(9)
      .stores({
        garments: "id, userId, locationId, status, category, archivedAt",
        storageCases: "id, userId",
        storageLocations: "id, userId, caseId",
        coordinates: "id, userId",
        syncQueue: "++id, type, createdAt",
        dolls: "id, userId, bodySize, archivedAt",
      })
      .upgrade(async (tx) => {
        const OLD_BLUE = "hsl(210, 70%, 55%)";
        const NEW_BLUE = "hsl(210, 55%, 55%)";

        const garmentsTable = tx.table("garments");
        /* eslint-disable no-param-reassign, @typescript-eslint/prefer-destructuring -- Dexie modify callback requires in-place mutation; destructuring loses type guard narrowing */
        await garmentsTable
          .toCollection()
          .filter(
            (g: Record<string, unknown>) =>
              Array.isArray(g.colors) && g.colors.includes(OLD_BLUE),
          )
          .modify((g: Record<string, unknown>) => {
            if (!Array.isArray(g.colors)) return;
            g.colors = g.colors.map((c: unknown) =>
              c === OLD_BLUE ? NEW_BLUE : c,
            );
          });

        const syncTable = tx.table("syncQueue");
        await syncTable
          .toCollection()
          .filter(
            (item: Record<string, unknown>) =>
              item.type === SYNC_ACTION_TYPE.GARMENT_CREATE ||
              item.type === SYNC_ACTION_TYPE.GARMENT_UPDATE,
          )
          .modify((item: Record<string, unknown>) => {
            if (!isRecord(item.payload)) return;
            const payload = item.payload;
            if (!Array.isArray(payload.colors)) return;
            payload.colors = payload.colors.map((c: unknown) =>
              c === OLD_BLUE ? NEW_BLUE : c,
            );
          });
        /* eslint-enable no-param-reassign, @typescript-eslint/prefer-destructuring */
      });
    this.version(10)
      .stores({
        garments: "id, userId, locationId, status, category, archivedAt",
        storageCases: "id, userId",
        storageLocations: "id, userId, caseId",
        coordinates: "id, userId",
        syncQueue: "++id, type, createdAt",
        dolls: "id, userId, bodySize, archivedAt",
      })
      .upgrade(async (tx) => {
        const locationsTable = tx.table("storageLocations");
        /* eslint-disable no-param-reassign -- Dexie modify callback requires in-place mutation */
        await locationsTable
          .toCollection()
          .modify((l: Record<string, unknown>) => {
            l.confirmAllCount ??= 0;
            l.correctionCount ??= 0;
          });
        /* eslint-enable no-param-reassign */
      });
  }
}

const holder = new Map<string, DollWardrobeDB>();

/* eslint-disable functional/immutable-data -- lazy singleton requires one-time mutation to defer IndexedDB access from SSR */
export const getDb = (): DollWardrobeDB => {
  const existing = holder.get("db");
  if (existing !== undefined) return existing;
  const instance = new DollWardrobeDB();
  holder.set("db", instance);
  return instance;
};
/* eslint-enable functional/immutable-data */
