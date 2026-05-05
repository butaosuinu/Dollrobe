import { env } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDrizzle } from "../db/client";
import { createTestLogger } from "../test/helpers";
import * as syncRepo from "../repositories/sync-repository";
import { ACTION_PROCESSORS } from "./sync-processors";

vi.mock("../repositories/sync-repository", () => ({
  upsertGarment: vi.fn().mockResolvedValue(undefined),
  deleteGarment: vi.fn().mockResolvedValue(undefined),
  upsertStorageCase: vi.fn().mockResolvedValue(undefined),
  upsertStorageLocation: vi.fn().mockResolvedValue(undefined),
  upsertDoll: vi.fn().mockResolvedValue(undefined),
  deleteDoll: vi.fn().mockResolvedValue(undefined),
  upsertCoordinate: vi.fn().mockResolvedValue(undefined),
  deleteCoordinate: vi.fn().mockResolvedValue(undefined),
  deleteStorageCaseWithCascade: vi.fn().mockResolvedValue(undefined),
}));

const mockedRepo = vi.mocked(syncRepo);

const logger = createTestLogger();
// 実際のリポジトリ呼び出しは vi.mock で差し替え済み。型を満たすために実 DB を渡す
const drizzleDb = createDrizzle(env.DB);
const ctx = { drizzleDb, userId: "user-1", logger } as const;

const NOW = 1_700_000_000_000;

const validGarmentPayload = {
  id: "g-1",
  userId: "user-original",
  name: "テスト服",
  category: "dress",
  dollSizes: ["MSD"],
  colors: [],
  tags: [],
  status: "stored",
  lastScannedAt: NOW,
  confidenceDecayDays: 30,
  createdAt: NOW,
  updatedAt: NOW,
};

const validCasePayload = {
  id: "c-1",
  userId: "user-original",
  name: "テストケース",
  rows: 3,
  cols: 2,
  createdAt: NOW,
};

const validLocationPayload = {
  id: "l-1",
  userId: "user-original",
  caseId: "c-1",
  label: "A-1",
  row: 0,
  col: 0,
  createdAt: NOW,
};

const validDollPayload = {
  id: "d-1",
  userId: "user-original",
  name: "テストドール",
  bodySize: "MSD",
  createdAt: NOW,
  updatedAt: NOW,
};

const validCoordinatePayload = {
  id: "co-1",
  userId: "user-original",
  name: "テストコーデ",
  garmentIds: ["g-1"],
  isAiGenerated: false,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  Object.values(mockedRepo).forEach((fn) => {
    fn.mockClear();
    fn.mockResolvedValue(undefined);
  });
});

describe("ACTION_PROCESSORS — safeParse 失敗時に BAD_REQUEST を返す", () => {
  it("garment:create に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["garment:create"]!;
    const result = await processor(ctx, { invalid: true });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain("Invalid garment payload");
    }
    expect(mockedRepo.upsertGarment).not.toHaveBeenCalled();
  });

  it("garment:delete に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["garment:delete"]!;
    const result = await processor(ctx, { foo: "bar" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
    expect(mockedRepo.deleteGarment).not.toHaveBeenCalled();
  });

  it("storageCase:update に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["storageCase:update"]!;
    const result = await processor(ctx, { id: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Invalid storageCase payload");
    }
  });

  it("storageCase:delete に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["storageCase:delete"]!;
    const result = await processor(ctx, {});

    expect(result.ok).toBe(false);
    expect(mockedRepo.deleteStorageCaseWithCascade).not.toHaveBeenCalled();
  });

  it("storageLocation:create に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["storageLocation:create"]!;
    const result = await processor(ctx, { id: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Invalid storageLocation payload");
    }
  });

  it("storageLocation:update に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["storageLocation:update"]!;
    const result = await processor(ctx, { invalid: true });

    expect(result.ok).toBe(false);
    expect(mockedRepo.upsertStorageLocation).not.toHaveBeenCalled();
  });

  it("doll:create に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["doll:create"]!;
    const result = await processor(ctx, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Invalid doll payload");
    }
    expect(mockedRepo.upsertDoll).not.toHaveBeenCalled();
  });

  it("doll:delete に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["doll:delete"]!;
    const result = await processor(ctx, {});

    expect(result.ok).toBe(false);
    expect(mockedRepo.deleteDoll).not.toHaveBeenCalled();
  });

  it("coordinate:create に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["coordinate:create"]!;
    const result = await processor(ctx, { id: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Invalid coordinate payload");
    }
    expect(mockedRepo.upsertCoordinate).not.toHaveBeenCalled();
  });

  it("coordinate:delete に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["coordinate:delete"]!;
    const result = await processor(ctx, {});

    expect(result.ok).toBe(false);
    expect(mockedRepo.deleteCoordinate).not.toHaveBeenCalled();
  });
});

describe("storageCase:create の二形式", () => {
  it("with locations 形式: case を upsert し、locations も upsert する", async () => {
    const processor = ACTION_PROCESSORS["storageCase:create"]!;
    const payload = {
      storageCase: validCasePayload,
      locations: [
        validLocationPayload,
        { ...validLocationPayload, id: "l-2", label: "A-2", col: 1 },
      ],
    };

    const result = await processor(ctx, payload);

    expect(result.ok).toBe(true);
    expect(mockedRepo.upsertStorageCase).toHaveBeenCalledTimes(1);
    expect(mockedRepo.upsertStorageLocation).toHaveBeenCalledTimes(2);
  });

  it("case-only 形式: case のみ upsert する", async () => {
    const processor = ACTION_PROCESSORS["storageCase:create"]!;

    const result = await processor(ctx, validCasePayload);

    expect(result.ok).toBe(true);
    expect(mockedRepo.upsertStorageCase).toHaveBeenCalledTimes(1);
    expect(mockedRepo.upsertStorageLocation).not.toHaveBeenCalled();
  });

  it("どちらの形式にも該当しない場合 BAD_REQUEST を返す", async () => {
    const processor = ACTION_PROCESSORS["storageCase:create"]!;

    const result = await processor(ctx, { id: "missing-fields" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain(
        "Invalid storageCase:create payload",
      );
    }
  });
});

describe("hasLocationCounters の OR 分岐", () => {
  it("confirmAllCount が指定されている場合 includeCounters=true で呼ばれる", async () => {
    const processor = ACTION_PROCESSORS["storageLocation:create"]!;
    const payload = { ...validLocationPayload, confirmAllCount: 5 };

    await processor(ctx, payload);

    expect(mockedRepo.upsertStorageLocation).toHaveBeenCalledWith(
      expect.objectContaining({ includeCounters: true }),
    );
  });

  it("correctionCount が指定されている場合 includeCounters=true", async () => {
    const processor = ACTION_PROCESSORS["storageLocation:create"]!;
    const payload = { ...validLocationPayload, correctionCount: 2 };

    await processor(ctx, payload);

    expect(mockedRepo.upsertStorageLocation).toHaveBeenCalledWith(
      expect.objectContaining({ includeCounters: true }),
    );
  });

  it("lastVisitedAt が指定されている場合 includeCounters=true", async () => {
    const processor = ACTION_PROCESSORS["storageLocation:create"]!;
    const payload = { ...validLocationPayload, lastVisitedAt: NOW };

    await processor(ctx, payload);

    expect(mockedRepo.upsertStorageLocation).toHaveBeenCalledWith(
      expect.objectContaining({ includeCounters: true }),
    );
  });

  it("カウンタ系がいずれも未定義の場合 includeCounters=false", async () => {
    const processor = ACTION_PROCESSORS["storageLocation:update"]!;

    await processor(ctx, validLocationPayload);

    expect(mockedRepo.upsertStorageLocation).toHaveBeenCalledWith(
      expect.objectContaining({ includeCounters: false }),
    );
  });
});

describe("正常系の最終確認 (回帰)", () => {
  it("garment:create が処理される", async () => {
    const processor = ACTION_PROCESSORS["garment:create"]!;
    const result = await processor(ctx, validGarmentPayload);
    expect(result.ok).toBe(true);
    expect(mockedRepo.upsertGarment).toHaveBeenCalledTimes(1);
  });

  it("doll:create が処理される", async () => {
    const processor = ACTION_PROCESSORS["doll:create"]!;
    const result = await processor(ctx, validDollPayload);
    expect(result.ok).toBe(true);
    expect(mockedRepo.upsertDoll).toHaveBeenCalledTimes(1);
  });

  it("coordinate:create が処理される", async () => {
    const processor = ACTION_PROCESSORS["coordinate:create"]!;
    const result = await processor(ctx, validCoordinatePayload);
    expect(result.ok).toBe(true);
    expect(mockedRepo.upsertCoordinate).toHaveBeenCalledTimes(1);
  });
});
