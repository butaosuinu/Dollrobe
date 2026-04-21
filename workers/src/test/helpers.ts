import { env } from "cloudflare:test";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "../trpc/index";
import { appRouter } from "../trpc/router";
import type { TRPCContext } from "../trpc/index";
import type { CreateGarmentInput } from "../db/validation";
import { createLogger } from "../lib/logger";

const createCaller = createCallerFactory(appRouter);

export const getTestDb = () => env.DB;

export const createTestCaller = () => {
  const mockCtx: TRPCContext = {
    env,
    logger: createLogger({ minLevel: "error" }),
  };
  return createCaller(mockCtx);
};

export const expectTRPCError = (error: unknown, code: string) => {
  expect(error).toBeInstanceOf(TRPCError);
  if (error instanceof TRPCError) {
    expect(error.code).toBe(code);
  }
};

export const resetDatabase = async (db: D1Database) => {
  await db.exec("DELETE FROM digests");
  await db.exec("DELETE FROM tombstones");
  await db.exec("DELETE FROM garments");
  await db.exec("DELETE FROM storage_locations");
  await db.exec("DELETE FROM storage_cases");
  await db.exec("DELETE FROM coordinates");
  await db.exec("DELETE FROM dolls");
};

export const createTestGarmentInput = (
  overrides: Partial<CreateGarmentInput> = {},
): CreateGarmentInput => ({
  name: "テストドレス",
  category: "dress",
  dollSizes: ["MSD"],
  colors: ["hsl(0,100%,50%)"],
  tags: ["test"],
  confidenceDecayDays: 30,
  ...overrides,
});

export const createTestCaseInput = (
  overrides: Record<string, unknown> = {},
) => ({
  name: "テスト衣装ケース",
  type: "grid" as const,
  rows: 3,
  cols: 2,
  ...overrides,
});
