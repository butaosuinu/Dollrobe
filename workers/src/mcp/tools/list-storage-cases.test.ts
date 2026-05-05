import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import type { Context as HonoContext } from "hono";
import { handleListStorageCases } from "./list-storage-cases";
import { createMcpCaller } from "../adapter";
import {
  createStubAuth,
  createTestCaseInput,
  createTestLogger,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";

const createStubHonoContext = (): HonoContext => {
  const headers = new Headers();
  const stub = { req: { raw: { headers } } };
  return stub as unknown as HonoContext;
};

const buildCtx = (scope: "read" | "write") => ({
  caller: createMcpCaller({
    env,
    auth: createStubAuth("mcp-user"),
    honoContext: createStubHonoContext(),
    logger: createTestLogger(),
  }),
  scope,
  logger: createTestLogger(),
});

describe("handleListStorageCases", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the user's storage cases", async () => {
    const ctx = buildCtx("read");
    await ctx.caller.location.createCase(createTestCaseInput());

    const result = await handleListStorageCases({}, ctx);

    expect(result.isError).toBeUndefined();
    const payload = result.structuredContent as {
      readonly cases: ReadonlyArray<{ readonly name: string }>;
    };
    expect(payload.cases).toHaveLength(1);
    expect(payload.cases[0]?.name).toBe("テスト衣装ケース");
  });
});
