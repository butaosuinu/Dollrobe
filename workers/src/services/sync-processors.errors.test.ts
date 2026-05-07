import { env } from "cloudflare:test";
import { TRPCError } from "@trpc/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDrizzle } from "../db/client";
import {
  TEST_USER_ID,
  createTestLogger,
  getTestDb,
  resetDatabase,
} from "../test/helpers";
import { ACTION_PROCESSORS } from "./sync-processors";

const logger = createTestLogger();
const drizzleDb = createDrizzle(env.DB);
const ctx = { drizzleDb, userId: TEST_USER_ID, logger } as const;

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

beforeEach(async () => {
  await resetDatabase(getTestDb());
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
  });

  it("garment:delete に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["garment:delete"]!;
    const result = await processor(ctx, { foo: "bar" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
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
  });

  it("storageCase:create にどちらの形式にも該当しない payload を渡すと BAD_REQUEST", async () => {
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
  });

  it("doll:create に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["doll:create"]!;
    const result = await processor(ctx, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Invalid doll payload");
    }
  });

  it("doll:delete に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["doll:delete"]!;
    const result = await processor(ctx, {});

    expect(result.ok).toBe(false);
  });

  it("coordinate:create に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["coordinate:create"]!;
    const result = await processor(ctx, { id: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Invalid coordinate payload");
    }
  });

  it("coordinate:delete に不正な payload を渡すと BAD_REQUEST", async () => {
    const processor = ACTION_PROCESSORS["coordinate:delete"]!;
    const result = await processor(ctx, {});

    expect(result.ok).toBe(false);
  });
});

describe("ACTION_PROCESSORS — DB 例外時の伝搬", () => {
  it("DB 例外発生時に TRPCError(INTERNAL_SERVER_ERROR) として伝搬する", async () => {
    const spy = vi.spyOn(env.DB, "prepare").mockImplementationOnce(() => {
      throw new Error("simulated d1 failure");
    });

    const processor = ACTION_PROCESSORS["garment:create"]!;

    await expect(processor(ctx, validGarmentPayload)).rejects.toMatchObject({
      name: "TRPCError",
      code: "INTERNAL_SERVER_ERROR",
    });

    spy.mockRestore();
  });

  it("processor は TRPCError インスタンスを reject する", async () => {
    const spy = vi.spyOn(env.DB, "prepare").mockImplementationOnce(() => {
      throw new Error("simulated d1 failure");
    });

    const processor = ACTION_PROCESSORS["garment:create"]!;

    await expect(processor(ctx, validGarmentPayload)).rejects.toBeInstanceOf(
      TRPCError,
    );

    spy.mockRestore();
  });
});
