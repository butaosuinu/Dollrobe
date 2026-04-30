import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STORAGE_CASE_TYPE, SYNC_ACTION_TYPE } from "@/lib/constants";
import { DollWardrobeDB } from "@/lib/db/dexie";

const TEST_DB_PREFIX = "DollWardrobe-test";

const uniqueDbName = (suffix: string): string =>
  `${TEST_DB_PREFIX}-${suffix}-${Math.random().toString(36).slice(2, 10)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

const STORES_V1: Record<string, string | null> = {
  garments: "id, userId, locationId, status, category",
  storageCases: "id, userId",
  storageLocations: "id, userId, caseId",
  coordinates: "id, userId",
  syncQueue: "++id, type, createdAt",
};

const STORES_V7: Record<string, string | null> = {
  garments: "id, userId, locationId, status, category, archivedAt",
  storageCases: "id, userId",
  storageLocations: "id, userId, caseId",
  coordinates: "id, userId",
  syncQueue: "++id, type, createdAt",
  dolls: "id, userId, bodySize, archivedAt",
};

type RawRecord = Record<string, unknown>;

const seedLegacyDb = async (
  dbName: string,
  version: number,
  stores: Record<string, string | null>,
  seed: (db: Dexie) => Promise<void>,
): Promise<void> => {
  const legacy = new Dexie(dbName);
  legacy.version(version).stores(stores);
  await legacy.open();
  await seed(legacy);
  legacy.close();
};

const runMigrationsAndClose = async (dbName: string): Promise<void> => {
  const db = new DollWardrobeDB(dbName);
  await db.open();
  db.close();
};

const readAllRaw = async (
  dbName: string,
  tableName: string,
): Promise<readonly RawRecord[]> => {
  const reader = new Dexie(dbName);
  reader.version(10).stores(STORES_V7);
  await reader.open();
  const rows: unknown[] = await reader.table(tableName).toArray();
  reader.close();
  return rows.filter(isRecord);
};

const findById = (rows: readonly RawRecord[], id: string) =>
  rows.find((row) => row.id === id);

const findByCreatedAt = (rows: readonly RawRecord[], createdAt: number) =>
  rows.find((row) => row.createdAt === createdAt);

const setupMigration = (
  suffix: string,
  version: number,
  stores: Record<string, string | null>,
  seed: (db: Dexie) => Promise<void>,
): { readonly getDbName: () => string } => {
  const dbName = uniqueDbName(suffix);
  beforeEach(async () => {
    await Dexie.delete(dbName);
    await seedLegacyDb(dbName, version, stores, seed);
  });
  afterEach(async () => {
    await Dexie.delete(dbName);
  });
  return { getDbName: () => dbName };
};

describe("DollWardrobeDB migrations", () => {
  describe("version 2: dollSize 1/3 -> SD, 1/6 -> other", () => {
    const ctx = setupMigration("v2", 1, STORES_V1, async (legacy) => {
      await legacy.table("garments").bulkAdd([
        { id: "g-1", userId: "u-1", dollSize: "1/3" },
        { id: "g-2", userId: "u-1", dollSize: "1/6" },
        { id: "g-3", userId: "u-1", dollSize: "MSD" },
      ]);
    });

    it("旧 dollSize 1/3 と 1/6 が SD と other に変換される", async () => {
      await runMigrationsAndClose(ctx.getDbName());
      const rows = await readAllRaw(ctx.getDbName(), "garments");

      // version 3 で dollSize -> dollSizes に変換されるため両方確認
      expect(findById(rows, "g-1")?.dollSizes).toEqual(["SD"]);
      expect(findById(rows, "g-2")?.dollSizes).toEqual(["other"]);
      expect(findById(rows, "g-3")?.dollSizes).toEqual(["MSD"]);
    });
  });

  describe("version 3: dollSize -> dollSizes 配列化", () => {
    const ctx = setupMigration("v3", 1, STORES_V1, async (legacy) => {
      await legacy.table("garments").bulkAdd([
        { id: "g-with-size", userId: "u-1", dollSize: "MSD" },
        { id: "g-already-array", userId: "u-1", dollSizes: ["SD", "MSD"] },
      ]);
    });

    it("dollSize が dollSizes 配列に変換され、元の dollSize は削除される", async () => {
      await runMigrationsAndClose(ctx.getDbName());
      const rows = await readAllRaw(ctx.getDbName(), "garments");

      const single = findById(rows, "g-with-size");
      expect(single?.dollSizes).toEqual(["MSD"]);
      expect(single?.dollSize).toBe(undefined);

      // 既に dollSizes が配列なら触らない
      expect(findById(rows, "g-already-array")?.dollSizes).toEqual([
        "SD",
        "MSD",
      ]);
    });
  });

  describe("version 4: syncQueue payload の dollSize 正規化", () => {
    const ctx = setupMigration("v4", 1, STORES_V1, async (legacy) => {
      await legacy.table("syncQueue").bulkAdd([
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: { id: "g-1", dollSize: "MSD" },
          createdAt: 1,
        },
        {
          type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
          payload: { id: "g-2", dollSize: "SD" },
          createdAt: 2,
        },
        {
          type: SYNC_ACTION_TYPE.STORAGE_CASE_CREATE,
          payload: { id: "c-1", dollSize: "ignored" },
          createdAt: 3,
        },
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: undefined,
          createdAt: 4,
        },
        {
          type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
          payload: { id: "g-3" },
          createdAt: 5,
        },
      ]);
    });

    it("garment アクションのみ payload.dollSize が dollSizes に変換される", async () => {
      await runMigrationsAndClose(ctx.getDbName());
      const items = await readAllRaw(ctx.getDbName(), "syncQueue");

      const create = findByCreatedAt(items, 1);
      const update = findByCreatedAt(items, 2);
      const otherType = findByCreatedAt(items, 3);
      const undefinedPayload = findByCreatedAt(items, 4);
      const noDollSize = findByCreatedAt(items, 5);

      if (
        isRecord(create?.payload) &&
        isRecord(update?.payload) &&
        isRecord(otherType?.payload) &&
        isRecord(noDollSize?.payload)
      ) {
        expect(create.payload.dollSizes).toEqual(["MSD"]);
        expect(create.payload.dollSize).toBe(undefined);
        expect(update.payload.dollSizes).toEqual(["SD"]);
        expect(update.payload.dollSize).toBe(undefined);
        // 別アクション type は変更されない
        expect(otherType.payload.dollSize).toBe("ignored");
        expect(otherType.payload.dollSizes).toBe(undefined);
        // dollSize が文字列でないレコードは触らない
        expect(noDollSize.payload.dollSizes).toBe(undefined);
      } else {
        expect.fail("payload が想定通りの record になっていない");
      }

      expect(undefinedPayload?.payload).toBe(undefined);
    });
  });

  describe("version 5: storageCase.type のデフォルト補完", () => {
    const ctx = setupMigration("v5", 1, STORES_V1, async (legacy) => {
      await legacy.table("storageCases").bulkAdd([
        { id: "c-no-type", userId: "u-1", name: "ケースA" },
        {
          id: "c-with-type",
          userId: "u-1",
          name: "ケースB",
          type: STORAGE_CASE_TYPE.UNIT,
        },
      ]);
    });

    it("type 未設定のケースに grid が補完され、既存値は保持される", async () => {
      await runMigrationsAndClose(ctx.getDbName());
      const cases = await readAllRaw(ctx.getDbName(), "storageCases");

      expect(findById(cases, "c-no-type")?.type).toBe(STORAGE_CASE_TYPE.GRID);
      expect(findById(cases, "c-with-type")?.type).toBe(
        STORAGE_CASE_TYPE.UNIT,
      );
    });
  });

  describe("version 8: DD/MDD 系サイズの細分化マイグレーション", () => {
    const ctx = setupMigration("v8", 7, STORES_V7, async (legacy) => {
      await legacy.table("garments").bulkAdd([
        { id: "g-mixed", userId: "u-1", dollSizes: ["DD", "SD", "MDD", 42] },
        { id: "g-no-array", userId: "u-1", dollSizes: undefined },
      ]);
      await legacy.table("dolls").bulkAdd([
        { id: "d-dd", userId: "u-1", bodySize: "DD" },
        { id: "d-mdd", userId: "u-1", bodySize: "MDD" },
        { id: "d-other", userId: "u-1", bodySize: "MSD" },
        { id: "d-no-string", userId: "u-1", bodySize: undefined },
      ]);
      await legacy.table("syncQueue").bulkAdd([
        {
          type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
          payload: { dollSizes: ["DD", "MDD", 99] },
          createdAt: 1,
        },
        {
          type: SYNC_ACTION_TYPE.DOLL_CREATE,
          payload: { bodySize: "DD" },
          createdAt: 2,
        },
        {
          type: SYNC_ACTION_TYPE.STORAGE_CASE_CREATE,
          payload: { bodySize: "DD" },
          createdAt: 3,
        },
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: undefined,
          createdAt: 4,
        },
        {
          type: SYNC_ACTION_TYPE.DOLL_UPDATE,
          payload: { bodySize: "MDD" },
          createdAt: 5,
        },
      ]);
    });

    it("garment.dollSizes / doll.bodySize / syncQueue payload が新サイズに置換される", async () => {
      const dbName = ctx.getDbName();
      await runMigrationsAndClose(dbName);

      const garments = await readAllRaw(dbName, "garments");
      // 文字列のみ残し、DD->DD_M, MDD->MDD_M に変換
      expect(findById(garments, "g-mixed")?.dollSizes).toEqual([
        "DD_M",
        "SD",
        "MDD_M",
      ]);
      // dollSizes が配列でないレコードは変更されない
      expect(findById(garments, "g-no-array")?.dollSizes).toBe(undefined);

      const dolls = await readAllRaw(dbName, "dolls");
      expect(findById(dolls, "d-dd")?.bodySize).toBe("DD_M");
      expect(findById(dolls, "d-mdd")?.bodySize).toBe("MDD_M");
      expect(findById(dolls, "d-other")?.bodySize).toBe("MSD");
      // bodySize が文字列でないレコードは変更されない
      expect(findById(dolls, "d-no-string")?.bodySize).toBe(undefined);

      const syncItems = await readAllRaw(dbName, "syncQueue");
      const garmentUpdate = findByCreatedAt(syncItems, 1);
      const dollCreate = findByCreatedAt(syncItems, 2);
      const storageCreate = findByCreatedAt(syncItems, 3);
      const undefinedPayload = findByCreatedAt(syncItems, 4);
      const dollUpdate = findByCreatedAt(syncItems, 5);

      if (
        isRecord(garmentUpdate?.payload) &&
        isRecord(dollCreate?.payload) &&
        isRecord(storageCreate?.payload) &&
        isRecord(dollUpdate?.payload)
      ) {
        expect(garmentUpdate.payload.dollSizes).toEqual(["DD_M", "MDD_M"]);
        expect(dollCreate.payload.bodySize).toBe("DD_M");
        // 関係ないアクション type は変更されない
        expect(storageCreate.payload.bodySize).toBe("DD");
        expect(dollUpdate.payload.bodySize).toBe("MDD_M");
      } else {
        expect.fail("payload が想定通りの record になっていない");
      }

      expect(undefinedPayload?.payload).toBe(undefined);
    });
  });

  describe("version 9: 旧 blue 色の置換", () => {
    const OLD_BLUE = "hsl(210, 70%, 55%)";
    const NEW_BLUE = "hsl(210, 55%, 55%)";
    const ctx = setupMigration("v9", 7, STORES_V7, async (legacy) => {
      await legacy.table("garments").bulkAdd([
        {
          id: "g-with-old-blue",
          userId: "u-1",
          dollSizes: ["SD"],
          colors: [OLD_BLUE, "hsl(0, 0%, 50%)"],
        },
        {
          id: "g-no-old",
          userId: "u-1",
          dollSizes: ["SD"],
          colors: ["hsl(0, 0%, 50%)"],
        },
        // colors が無い → filter で除外される
        { id: "g-no-colors", userId: "u-1", dollSizes: ["SD"] },
      ]);
      await legacy.table("syncQueue").bulkAdd([
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: { colors: [OLD_BLUE, "hsl(60, 50%, 50%)"] },
          createdAt: 1,
        },
        {
          type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
          payload: { id: "x" },
          createdAt: 2,
        },
        {
          type: SYNC_ACTION_TYPE.STORAGE_CASE_CREATE,
          payload: { colors: [OLD_BLUE] },
          createdAt: 3,
        },
        {
          type: SYNC_ACTION_TYPE.GARMENT_CREATE,
          payload: undefined,
          createdAt: 4,
        },
      ]);
    });

    it("旧 blue を新 blue に置換し、対象外データは変更しない", async () => {
      const dbName = ctx.getDbName();
      await runMigrationsAndClose(dbName);
      const garments = await readAllRaw(dbName, "garments");

      const withOldBlue = findById(garments, "g-with-old-blue");
      expect(isStringArray(withOldBlue?.colors)).toBe(true);
      if (isStringArray(withOldBlue?.colors)) {
        expect(withOldBlue.colors).toEqual([NEW_BLUE, "hsl(0, 0%, 50%)"]);
      }
      expect(findById(garments, "g-no-old")?.colors).toEqual([
        "hsl(0, 0%, 50%)",
      ]);
      expect(findById(garments, "g-no-colors")?.colors).toBe(undefined);

      const syncItems = await readAllRaw(dbName, "syncQueue");
      const created = findByCreatedAt(syncItems, 1);
      const noColorsPayload = findByCreatedAt(syncItems, 2);
      const ignoredType = findByCreatedAt(syncItems, 3);
      const undefinedPayload = findByCreatedAt(syncItems, 4);

      if (
        isRecord(created?.payload) &&
        isRecord(noColorsPayload?.payload) &&
        isRecord(ignoredType?.payload)
      ) {
        expect(created.payload.colors).toEqual([
          NEW_BLUE,
          "hsl(60, 50%, 50%)",
        ]);
        // colors を持たない payload は変更なし
        expect(noColorsPayload.payload.colors).toBe(undefined);
        // 関係ないアクション type は変更なし
        expect(ignoredType.payload.colors).toEqual([OLD_BLUE]);
      } else {
        expect.fail("payload が想定通りの record になっていない");
      }

      expect(undefinedPayload?.payload).toBe(undefined);
    });
  });

  describe("version 10: storageLocation のカウンタ初期化", () => {
    const ctx = setupMigration("v10", 7, STORES_V7, async (legacy) => {
      await legacy.table("storageLocations").bulkAdd([
        {
          id: "l-blank",
          userId: "u-1",
          caseId: "c-1",
          label: "A-1",
          row: 0,
          col: 0,
          createdAt: 1,
        },
        {
          id: "l-with-counts",
          userId: "u-1",
          caseId: "c-1",
          label: "A-2",
          row: 0,
          col: 1,
          confirmAllCount: 7,
          correctionCount: 3,
          lastVisitedAt: 12_345,
          createdAt: 2,
        },
      ]);
    });

    it("未設定のカウンタは 0、既存値は保持される", async () => {
      const dbName = ctx.getDbName();
      await runMigrationsAndClose(dbName);
      const locations = await readAllRaw(dbName, "storageLocations");

      const blank = findById(locations, "l-blank");
      expect(blank?.confirmAllCount).toBe(0);
      expect(blank?.correctionCount).toBe(0);
      expect(blank?.lastVisitedAt).toBe(undefined);

      const filled = findById(locations, "l-with-counts");
      expect(filled?.confirmAllCount).toBe(7);
      expect(filled?.correctionCount).toBe(3);
      expect(filled?.lastVisitedAt).toBe(12_345);
    });
  });

  it("dbName 引数で任意の名前の DB を開ける", async () => {
    const dbName = uniqueDbName("custom-name");
    const db = new DollWardrobeDB(dbName);
    await db.open();
    expect(db.name).toBe(dbName);
    db.close();
    await Dexie.delete(dbName);
  });
});
