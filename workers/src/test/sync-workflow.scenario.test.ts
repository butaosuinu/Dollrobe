import { createId } from "@paralleldrive/cuid2";
import { TEMP_USER_ID } from "../trpc/lib/d1-helpers";
import {
  createTestCaller,
  resetDatabase,
  getTestDb,
  expectTRPCError,
} from "./helpers";
import { insertGarment } from "../../test/helpers/factories";

const createGarmentPayload = (overrides: Record<string, unknown> = {}) => {
  const now = Date.now();
  return {
    id: createId(),
    userId: TEMP_USER_ID,
    name: "テスト服",
    category: "dress",
    dollSize: "MSD",
    colors: ["hsl(0,100%,50%)"],
    tags: ["test"],
    status: "stored",
    lastScannedAt: now,
    confidenceDecayDays: 30,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

const createCasePayload = (overrides: Record<string, unknown> = {}) => {
  const now = Date.now();
  return {
    id: createId(),
    userId: TEMP_USER_ID,
    name: "テストケース",
    rows: 3,
    cols: 2,
    createdAt: now,
    ...overrides,
  };
};

const createLocationPayload = (
  caseId: string,
  overrides: Record<string, unknown> = {},
) => ({
  id: createId(),
  userId: TEMP_USER_ID,
  caseId,
  label: "A-1",
  row: 0,
  col: 0,
  createdAt: Date.now(),
  ...overrides,
});

describe("同期ワークフロー シナリオ", () => {
  const getCaller = () => createTestCaller();

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  describe("garment 同期", () => {
    it("garment:create を push すると pull で取得できる", async () => {
      const caller = getCaller();
      const garment = createGarmentPayload();

      await caller.sync.push({
        items: [
          {
            type: "garment:create",
            payload: garment,
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.garments).toHaveLength(1);
      expect(pulled.garments[0]!.id).toBe(garment.id);
      expect(pulled.garments[0]!.name).toBe("テスト服");
    });

    it("garment:update を push すると pull で更新された値が返る", async () => {
      const caller = getCaller();
      const garment = createGarmentPayload();
      const updatedAt = Date.now() + 1000;

      await caller.sync.push({
        items: [
          {
            type: "garment:create",
            payload: garment,
            createdAt: Date.now(),
          },
        ],
      });

      await caller.sync.push({
        items: [
          {
            type: "garment:update",
            payload: { ...garment, name: "更新済み服", updatedAt },
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.garments).toHaveLength(1);
      expect(pulled.garments[0]!.name).toBe("更新済み服");
    });

    it("garment:delete を push すると pull で返らない", async () => {
      const caller = getCaller();
      const garment = createGarmentPayload();

      await caller.sync.push({
        items: [
          {
            type: "garment:create",
            payload: garment,
            createdAt: Date.now(),
          },
        ],
      });

      await caller.sync.push({
        items: [
          {
            type: "garment:delete",
            payload: { id: garment.id },
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.garments).toHaveLength(0);
    });
  });

  describe("storageCase 同期", () => {
    it("storageCase:create (with locations) を push すると pull で case と locations が返る", async () => {
      const caller = getCaller();
      const casePayload = createCasePayload();
      const locations = [
        createLocationPayload(casePayload.id, { label: "A-1", row: 0, col: 0 }),
        createLocationPayload(casePayload.id, { label: "A-2", row: 0, col: 1 }),
      ];

      await caller.sync.push({
        items: [
          {
            type: "storageCase:create",
            payload: { storageCase: casePayload, locations },
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.storageCases).toHaveLength(1);
      expect(pulled.storageCases[0]!.name).toBe("テストケース");
      expect(pulled.storageLocations).toHaveLength(2);
    });

    it("storageCase:create (case only) を push すると pull で case が返る", async () => {
      const caller = getCaller();
      const casePayload = createCasePayload();

      await caller.sync.push({
        items: [
          {
            type: "storageCase:create",
            payload: casePayload,
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.storageCases).toHaveLength(1);
      expect(pulled.storageCases[0]!.id).toBe(casePayload.id);
    });

    it("storageCase:update を push すると pull で name が更新されている", async () => {
      const caller = getCaller();
      const casePayload = createCasePayload();

      await caller.sync.push({
        items: [
          {
            type: "storageCase:create",
            payload: casePayload,
            createdAt: Date.now(),
          },
          {
            type: "storageCase:update",
            payload: { ...casePayload, name: "更新ケース" },
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.storageCases).toHaveLength(1);
      expect(pulled.storageCases[0]!.name).toBe("更新ケース");
    });

    it("storageCase:delete を push すると pull で case と locations が消える", async () => {
      const caller = getCaller();
      const casePayload = createCasePayload();
      const location = createLocationPayload(casePayload.id);

      await caller.sync.push({
        items: [
          {
            type: "storageCase:create",
            payload: { storageCase: casePayload, locations: [location] },
            createdAt: Date.now(),
          },
        ],
      });

      await caller.sync.push({
        items: [
          {
            type: "storageCase:delete",
            payload: { id: casePayload.id },
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.storageCases).toHaveLength(0);
      expect(pulled.storageLocations).toHaveLength(0);
    });
  });

  describe("storageLocation 同期", () => {
    it("storageLocation:create を push すると pull で返る", async () => {
      const caller = getCaller();
      const casePayload = createCasePayload();
      const location = createLocationPayload(casePayload.id);

      await caller.sync.push({
        items: [
          {
            type: "storageCase:create",
            payload: casePayload,
            createdAt: Date.now(),
          },
          {
            type: "storageLocation:create",
            payload: location,
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.storageLocations).toHaveLength(1);
      expect(pulled.storageLocations[0]!.id).toBe(location.id);
    });
  });

  describe("LWW コンフリクト解決", () => {
    it("既存より古い updatedAt の push は更新されない", async () => {
      const caller = getCaller();
      const now = Date.now();
      const garmentId = createId();

      await insertGarment({
        db: getTestDb(),
        overrides: {
          id: garmentId,
          name: "サーバー版",
          lastScannedAt: now + 2000,
        },
      });

      await caller.sync.push({
        items: [
          {
            type: "garment:update",
            payload: createGarmentPayload({
              id: garmentId,
              name: "古いクライアント版",
              updatedAt: now - 1000,
            }),
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.garments).toHaveLength(1);
      expect(pulled.garments[0]!.name).toBe("サーバー版");
    });

    it("既存より新しい updatedAt の push は更新される", async () => {
      const caller = getCaller();
      const now = Date.now();
      const garmentId = createId();

      await insertGarment({
        db: getTestDb(),
        overrides: { id: garmentId, name: "サーバー版" },
      });

      await caller.sync.push({
        items: [
          {
            type: "garment:update",
            payload: createGarmentPayload({
              id: garmentId,
              name: "新しいクライアント版",
              updatedAt: now + 10000,
            }),
            createdAt: Date.now(),
          },
        ],
      });

      const pulled = await caller.sync.pull();

      expect(pulled.garments).toHaveLength(1);
      expect(pulled.garments[0]!.name).toBe("新しいクライアント版");
    });
  });

  describe("複合バッチ", () => {
    it("複数の action type を混ぜた push が全て反映される", async () => {
      const caller = getCaller();
      const garment = createGarmentPayload();
      const casePayload = createCasePayload();
      const location = createLocationPayload(casePayload.id);

      const result = await caller.sync.push({
        items: [
          {
            type: "garment:create",
            payload: garment,
            createdAt: Date.now(),
          },
          {
            type: "storageCase:create",
            payload: { storageCase: casePayload, locations: [location] },
            createdAt: Date.now(),
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);

      const pulled = await caller.sync.pull();

      expect(pulled.garments).toHaveLength(1);
      expect(pulled.storageCases).toHaveLength(1);
      expect(pulled.storageLocations).toHaveLength(1);
    });
  });

  describe("pull 空状態", () => {
    it("データなしの場合は空配列が返る", async () => {
      const caller = getCaller();
      const pulled = await caller.sync.pull();

      expect(pulled.garments).toHaveLength(0);
      expect(pulled.storageCases).toHaveLength(0);
      expect(pulled.storageLocations).toHaveLength(0);
    });
  });

  describe("バリデーションエラー", () => {
    it("不正な payload の push はエラーになる", async () => {
      const caller = getCaller();

      const error = await caller.sync
        .push({
          items: [
            {
              type: "garment:create",
              payload: { invalid: true },
              createdAt: Date.now(),
            },
          ],
        })
        .catch((e: unknown) => e);

      expectTRPCError(error, "BAD_REQUEST");
    });
  });
});
