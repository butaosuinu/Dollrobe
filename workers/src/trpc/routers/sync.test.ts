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
