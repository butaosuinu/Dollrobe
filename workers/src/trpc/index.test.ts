import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "./index";
import { appRouter } from "./router";
import {
  createTestLogger,
  createStubAuth,
  insertTestUser,
  resetDatabase,
} from "../test/helpers";

const callerFactory = createCallerFactory(appRouter);

describe("trpc authMiddleware", () => {
  it("preAuthenticatedUserId 経由なら認証チェックをスキップする", async () => {
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      preAuthenticatedUserId: "user-pre-1",
    });
    const result = await caller.garment.list({});
    expect(result).toEqual([]);
  });

  it("auth が未定義 / honoContext が無い場合は UNAUTHORIZED", async () => {
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
    });
    const error = await caller.garment.list({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    if (error instanceof TRPCError) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });

  it("auth.api.getSession が null を返した場合 UNAUTHORIZED", async () => {
    const stubAuth = createStubAuth(undefined);
    const stubHono = {
      req: { raw: { headers: new Headers({ cookie: "session=x" }) } },
    } as unknown as import("hono").Context;
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      auth: stubAuth,
      honoContext: stubHono,
    });
    const error = await caller.garment.list({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    if (error instanceof TRPCError) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });

  it("auth.api.getSession が userId を返した場合は protectedProcedure が通る", async () => {
    const stubAuth = createStubAuth("user-stub-1");
    const stubHono = {
      req: { raw: { headers: new Headers({ cookie: "session=x" }) } },
    } as unknown as import("hono").Context;
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      auth: stubAuth,
      honoContext: stubHono,
    });
    const result = await caller.garment.list({});
    expect(result).toEqual([]);
  });
});

describe("trpc adminProcedure", () => {
  beforeEach(async () => {
    await resetDatabase(env.DB);
  });

  afterEach(async () => {
    await resetDatabase(env.DB);
  });

  it("認証していない (preAuthenticatedUserId 無し / auth 無し) と UNAUTHORIZED", async () => {
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
    });
    const error = await caller.admin.metrics.summary().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    if (error instanceof TRPCError) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });

  it("role=user の認証ユーザーは FORBIDDEN", async () => {
    await insertTestUser({
      db: env.DB,
      id: "user-1",
      role: "user",
    });
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      preAuthenticatedUserId: "user-1",
    });
    const error = await caller.admin.metrics.summary().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    if (error instanceof TRPCError) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("role=admin の認証ユーザーは通過する", async () => {
    await insertTestUser({
      db: env.DB,
      id: "admin-1",
      role: "admin",
    });
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      preAuthenticatedUserId: "admin-1",
    });
    const result = await caller.admin.metrics.summary();
    expect(result.totalUsers).toBeGreaterThanOrEqual(1);
  });

  it("frozen=true の admin は UNAUTHORIZED (二重ガード)", async () => {
    await insertTestUser({
      db: env.DB,
      id: "admin-frozen",
      role: "admin",
      frozen: true,
    });
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      preAuthenticatedUserId: "admin-frozen",
    });
    const error = await caller.admin.metrics.summary().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    if (error instanceof TRPCError) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });

  it("DB に存在しない userId は UNAUTHORIZED", async () => {
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      preAuthenticatedUserId: "phantom-user",
    });
    const error = await caller.admin.metrics.summary().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TRPCError);
    if (error instanceof TRPCError) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });
});
