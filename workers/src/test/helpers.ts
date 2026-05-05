import { env } from "cloudflare:test";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "../trpc/index";
import { appRouter } from "../trpc/router";
import type { TRPCContext } from "../trpc/index";
import type { Auth } from "../auth";
import type {
  CreateGarmentInput,
  CreateCoordinateInput,
} from "../db/validation";
import { createLogger } from "../lib/logger";
import type { Logger } from "../lib/logger";

const createCaller = createCallerFactory(appRouter);

export const TEST_USER_ID = "test-user-001";

export const getTestDb = () => env.DB;

export const createTestLogger = (): Logger =>
  createLogger({ minLevel: "error" });

export const createStubAuth = (userId: string | undefined): Auth => {
  const stub = {
    api: {
      getSession: async (_args: { headers: Headers }) =>
        await Promise.resolve(
          userId === undefined
            ? null
            : {
                user: { id: userId },
                session: { id: "stub-session", userId },
              },
        ),
    },
  };
  return stub as unknown as Auth;
};

export const createTestCaller = ({
  userId = TEST_USER_ID,
  logger = createTestLogger(),
}: {
  readonly userId?: string;
  readonly logger?: Logger;
} = {}) => {
  const mockCtx: TRPCContext = {
    env,
    logger,
    preAuthenticatedUserId: userId,
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

export const createTestCoordinateInput = (
  overrides: Partial<CreateCoordinateInput> = {},
): CreateCoordinateInput => ({
  name: "テストコーデ",
  garmentIds: [],
  isAiGenerated: false,
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
