import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "../trpc/index";
import { appRouter } from "../trpc/router";
import type { TRPCContext } from "../trpc/index";

const createCaller = createCallerFactory(appRouter);

export const getTestDb = () => globalThis.__testDb;

export const createTestCaller = (db: D1Database) => {
  const mockCtx: TRPCContext = {
    env: {
      DB: db,
      BUCKET: globalThis.__testBucket,
      KV: globalThis.__testKv,
      QUEUE: globalThis.__testQueue,
      R2_PUBLIC_URL: "https://test.example.com",
      BETTER_AUTH_SECRET: "test-secret",
      TWITTER_CLIENT_ID: "",
      TWITTER_CLIENT_SECRET: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      TRUSTED_ORIGINS: "http://localhost:3000",
      ALLOWED_ORIGINS: "http://localhost:3000",
    },
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
  await db.exec("DELETE FROM garments");
  await db.exec("DELETE FROM storage_locations");
  await db.exec("DELETE FROM storage_cases");
  await db.exec("DELETE FROM coordinates");
};

export const createTestGarmentInput = (
  overrides: Record<string, unknown> = {},
) => ({
  name: "テストドレス",
  category: "dress" as const,
  dollSize: "MSD" as const,
  colors: ["hsl(0,100%,50%)"],
  tags: ["test"],
  confidenceDecayDays: 30,
  ...overrides,
});

export const createTestCaseInput = (
  overrides: Record<string, unknown> = {},
) => ({
  name: "テスト衣装ケース",
  rows: 3,
  cols: 2,
  ...overrides,
});
