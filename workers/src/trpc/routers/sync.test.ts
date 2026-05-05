import { createId } from "@paralleldrive/cuid2";
import {
  createTestCaller,
  resetDatabase,
  getTestDb,
  expectTRPCError,
  TEST_USER_ID,
} from "../../test/helpers";
import {
  insertCoordinate,
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
              userId: TEST_USER_ID,
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
              userId: TEST_USER_ID,
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

    it("coordinate:create で保存され pull で取得できる", async () => {
      const caller = getCaller();
      const now = Date.now();
      const id = createId();

      const result = await caller.sync.push({
        items: [
          {
            type: "coordinate:create",
            payload: {
              id,
              userId: TEST_USER_ID,
              name: "春コーデ",
              garmentIds: ["g1", "g2"],
              isAiGenerated: false,
              memo: "お気に入り",
              createdAt: now,
              updatedAt: now,
            },
            createdAt: now,
          },
        ],
      });

      expect(result.processedCount).toBe(1);

      const pulled = await caller.sync.pull();
      expect(pulled.coordinates).toHaveLength(1);
      const coord = pulled.coordinates[0];
      expect(coord?.id).toBe(id);
      expect(coord?.name).toBe("春コーデ");
      expect(coord?.garmentIds).toEqual(["g1", "g2"]);
      expect(coord?.isAiGenerated).toBe(false);
      expect(coord?.memo).toBe("お気に入り");
    });

    it("coordinate:update で LWW により新しい updatedAt のみ適用される", async () => {
      const db = getTestDb();
      const { id } = await insertCoordinate({ db, overrides: { name: "旧" } });

      const caller = getCaller();
      const now = Date.now();

      // 古い payload (updatedAt が小さい) — 適用されない
      await caller.sync.push({
        items: [
          {
            type: "coordinate:update",
            payload: {
              id,
              userId: TEST_USER_ID,
              name: "古い更新",
              garmentIds: [],
              isAiGenerated: false,
              createdAt: now - 10_000,
              updatedAt: now - 10_000,
            },
            createdAt: now - 10_000,
          },
        ],
      });

      const pulledOld = await caller.sync.pull();
      expect(pulledOld.coordinates[0]?.name).toBe("旧");

      // 新しい payload — 適用される
      await caller.sync.push({
        items: [
          {
            type: "coordinate:update",
            payload: {
              id,
              userId: TEST_USER_ID,
              name: "新しい更新",
              garmentIds: ["g1"],
              isAiGenerated: true,
              createdAt: now,
              updatedAt: now + 10_000,
            },
            createdAt: now + 10_000,
          },
        ],
      });

      const pulledNew = await caller.sync.pull();
      expect(pulledNew.coordinates[0]?.name).toBe("新しい更新");
      expect(pulledNew.coordinates[0]?.isAiGenerated).toBe(true);
      expect(pulledNew.coordinates[0]?.garmentIds).toEqual(["g1"]);
    });

    it("coordinate:delete で行が削除される", async () => {
      const db = getTestDb();
      const { id } = await insertCoordinate({ db });

      const caller = getCaller();
      const beforeDelete = await caller.sync.pull();
      expect(beforeDelete.coordinates).toHaveLength(1);

      await caller.sync.push({
        items: [
          {
            type: "coordinate:delete",
            payload: { id },
            createdAt: Date.now(),
          },
        ],
      });

      const afterDelete = await caller.sync.pull();
      expect(afterDelete.coordinates).toHaveLength(0);
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
              userId: TEST_USER_ID,
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
              userId: TEST_USER_ID,
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
      expect(result.coordinates).toEqual([]);
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
      await insertCoordinate({ db });

      const caller = getCaller();
      const result = await caller.sync.pull();

      expect(result.dolls).toHaveLength(1);
      expect(result.garments).toHaveLength(1);
      expect(result.storageCases).toHaveLength(1);
      expect(result.storageLocations).toHaveLength(1);
      expect(result.coordinates).toHaveLength(1);
    });
  });
});
