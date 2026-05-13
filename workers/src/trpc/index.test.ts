import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "./index";
import { appRouter } from "./router";
import { createTestLogger, createStubAuth } from "../test/helpers";

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
