import { createId } from "@paralleldrive/cuid2";
import { TEMP_USER_ID } from "../lib/d1-helpers";
import {
  createTestCaller,
  resetDatabase,
  getTestDb,
  expectTRPCError,
} from "../../test/helpers";
import {
  insertDoll,
  insertGarment,
  insertStorageCase,
  insertStorageLocation,
} from "../../../test/helpers/factories";

describe("sync router", () => {
  const getCaller = () => createTestCaller();

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  describe("push", () => {
    it("processedCount を返す", async () => {
      const caller = getCaller();
      const now = Date.now();

      const result = await caller.sync.push({
        items: [
          {
            type: "garment:create",
            payload: {
              id: createId(),
              userId: TEMP_USER_ID,
              name: "テスト",
              category: "dress",
              dollSizes: ["MSD"],
              colors: [],
              tags: [],
              status: "stored",
              lastScannedAt: now,
              confidenceDecayDays: 30,
              createdAt: now,
              updatedAt: now,
            },
            createdAt: now,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
    });

    it("不正な action type で BAD_REQUEST エラー", async () => {
      const caller = getCaller();

      const error = await caller.sync
        .push({
          items: [
            {
              type: "invalid:type" as "garment:create",
              payload: {},
              createdAt: Date.now(),
            },
          ],
        })
        .catch((e: unknown) => e);

      expectTRPCError(error, "BAD_REQUEST");
    });
  });

  describe("pull", () => {
    it("空の DB から空配列を返す", async () => {
      const caller = getCaller();
      const result = await caller.sync.pull({});

      expect(result.dolls).toEqual([]);
      expect(result.garments).toEqual([]);
      expect(result.storageCases).toEqual([]);
      expect(result.storageLocations).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.nextCursor).toBeUndefined();
      expect(result.deletedIds).toEqual([]);
    });

    it("factory で挿入したデータを pull で取得できる", async () => {
      const db = getTestDb();
      const caseResult = await insertStorageCase({ db });
      await insertStorageLocation({
        db,
        overrides: { caseId: caseResult.id },
      });
      await insertGarment({ db });
      await insertDoll({ db });

      const caller = getCaller();
      const result = await caller.sync.pull({});

      expect(result.dolls).toHaveLength(1);
      expect(result.garments).toHaveLength(1);
      expect(result.storageCases).toHaveLength(1);
      expect(result.storageLocations).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe("pull (cursor pagination)", () => {
    it("limit 指定でページネーションされる", async () => {
      const db = getTestDb();
      await insertGarment({ db, overrides: { name: "g1" } });
      await insertGarment({ db, overrides: { name: "g2" } });
      await insertGarment({ db, overrides: { name: "g3" } });

      const caller = getCaller();
      const page1 = await caller.sync.pull({ limit: 2 });

      expect(page1.garments).toHaveLength(2);
      expect(page1.totalCount).toBe(3);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await caller.sync.pull({
        limit: 2,
        cursor: page1.nextCursor,
      });

      expect(page2.garments).toHaveLength(1);
      expect(page2.nextCursor).toBeUndefined();
    });

    it("全ページを取得すると全件揃う", async () => {
      const db = getTestDb();
      const inserted = await Promise.all(
        Array.from(
          { length: 5 },
          async (_, i) =>
            await insertGarment({ db, overrides: { name: `garment-${i}` } }),
        ),
      );

      const caller = getCaller();
      const allGarmentIds: string[] = [];

      const p1 = await caller.sync.pull({ limit: 2 });
      allGarmentIds.push(...p1.garments.map((g) => g.id));

      const p2 = await caller.sync.pull({
        limit: 2,
        cursor: p1.nextCursor,
      });
      allGarmentIds.push(...p2.garments.map((g) => g.id));

      const p3 = await caller.sync.pull({
        limit: 2,
        cursor: p2.nextCursor,
      });
      allGarmentIds.push(...p3.garments.map((g) => g.id));

      expect(allGarmentIds).toHaveLength(5);
      const uniqueIds = new Set(allGarmentIds);
      expect(uniqueIds.size).toBe(5);
      inserted.forEach(({ id }) => expect(uniqueIds.has(id)).toBe(true));
    });
  });

  describe("pull (delta sync)", () => {
    it("since 指定で更新分のみ返す", async () => {
      const db = getTestDb();
      const oldTime = Date.now() - 100_000;
      const newTime = Date.now();

      await db
        .prepare(
          `INSERT INTO garments (id, user_id, name, category, doll_sizes, colors, tags, status, last_scanned_at, confidence_decay_days, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
        )
        .bind(
          "old-garment",
          TEMP_USER_ID,
          "古い服",
          "dress",
          '["SD"]',
          "[]",
          "[]",
          "stored",
          oldTime,
          30,
          oldTime,
          oldTime,
        )
        .run();

      await db
        .prepare(
          `INSERT INTO garments (id, user_id, name, category, doll_sizes, colors, tags, status, last_scanned_at, confidence_decay_days, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
        )
        .bind(
          "new-garment",
          TEMP_USER_ID,
          "新しい服",
          "dress",
          '["SD"]',
          "[]",
          "[]",
          "stored",
          newTime,
          30,
          newTime,
          newTime,
        )
        .run();

      const caller = getCaller();
      const result = await caller.sync.pull({ since: oldTime + 1 });

      expect(result.garments).toHaveLength(1);
      expect(result.garments[0].id).toBe("new-garment");
    });
  });

  describe("pull (tombstones)", () => {
    it("削除された garment の ID が deletedIds に含まれる", async () => {
      const db = getTestDb();
      const { id } = await insertGarment({ db });

      const caller = getCaller();
      await caller.garment.delete({ id });

      const result = await caller.sync.pull({});

      expect(result.deletedIds).toContainEqual({
        entityType: "garment",
        entityId: id,
      });
    });

    it("since 指定で該当期間の削除分のみ返す", async () => {
      const db = getTestDb();
      const now = Date.now();

      const { id: oldId } = await insertGarment({
        db,
        overrides: { id: "old-del" },
      });
      const caller = getCaller();
      await caller.garment.delete({ id: oldId });

      await db
        .prepare("UPDATE tombstones SET deleted_at = ?1 WHERE entity_id = ?2")
        .bind(now - 100_000, oldId)
        .run();

      const { id: newId } = await insertGarment({
        db,
        overrides: { id: "new-del" },
      });
      await caller.garment.delete({ id: newId });

      const result = await caller.sync.pull({ since: now - 50_000 });

      expect(result.deletedIds).toHaveLength(1);
      expect(result.deletedIds[0].entityId).toBe("new-del");
    });
  });
});
