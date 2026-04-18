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

    it("storageLocation:update で confirmAllCount/correctionCount/lastVisitedAt がサーバーに書き込まれる", async () => {
      const db = getTestDb();
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locationId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });

      const caller = getCaller();
      const now = Date.now();

      await caller.sync.push({
        items: [
          {
            type: "storageLocation:update",
            payload: {
              id: locationId,
              userId: TEMP_USER_ID,
              caseId,
              label: "A-1",
              row: 0,
              col: 0,
              lastVisitedAt: now,
              confirmAllCount: 5,
              correctionCount: 2,
              createdAt: now,
            },
            createdAt: now,
          },
        ],
      });

      const pulled = await caller.sync.pull();
      const loc = pulled.storageLocations[0];
      expect(loc?.confirmAllCount).toBe(5);
      expect(loc?.correctionCount).toBe(2);
      expect(loc?.lastVisitedAt).toBe(now);
    });

    it("カウンター列を含まない storageLocation:update で既存カウンターが保持される", async () => {
      const db = getTestDb();
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locationId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });

      const caller = getCaller();
      const now = Date.now();

      // 最初にカウンターをセット
      await caller.sync.push({
        items: [
          {
            type: "storageLocation:update",
            payload: {
              id: locationId,
              userId: TEMP_USER_ID,
              caseId,
              label: "A-1",
              row: 0,
              col: 0,
              lastVisitedAt: now,
              confirmAllCount: 7,
              correctionCount: 1,
              createdAt: now,
            },
            createdAt: now,
          },
        ],
      });

      // カウンター列を含まない payload（古い client 相当）で name だけ変更
      await caller.sync.push({
        items: [
          {
            type: "storageLocation:update",
            payload: {
              id: locationId,
              userId: TEMP_USER_ID,
              caseId,
              label: "A-1",
              customName: "新しい名前",
              row: 0,
              col: 0,
              createdAt: now,
            },
            createdAt: now + 1,
          },
        ],
      });

      const pulled = await caller.sync.pull();
      const loc = pulled.storageLocations[0];
      expect(loc?.customName).toBe("新しい名前");
      expect(loc?.confirmAllCount).toBe(7);
      expect(loc?.correctionCount).toBe(1);
      expect(loc?.lastVisitedAt).toBe(now);
    });
  });

  describe("pull", () => {
    it("空の DB から空配列を返す", async () => {
      const caller = getCaller();
      const result = await caller.sync.pull();

      expect(result.dolls).toEqual([]);
      expect(result.garments).toEqual([]);
      expect(result.storageCases).toEqual([]);
      expect(result.storageLocations).toEqual([]);
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
      const result = await caller.sync.pull();

      expect(result.dolls).toHaveLength(1);
      expect(result.garments).toHaveLength(1);
      expect(result.storageCases).toHaveLength(1);
      expect(result.storageLocations).toHaveLength(1);
    });
  });
});
