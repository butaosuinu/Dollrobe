import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import type { Context as HonoContext } from "hono";
import { handleGetStorageCase } from "./get-storage-case";
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

describe("handleGetStorageCase", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the storage case with its locations", async () => {
    const ctx = buildCtx("read");
    const created = await ctx.caller.location.createCase(createTestCaseInput());

    const result = await handleGetStorageCase({ id: created.id }, ctx);

    expect(result.isError).toBeUndefined();
    const detail = result.structuredContent as {
      readonly storageCase: { readonly id: string };
      readonly locations: readonly unknown[];
    };
    expect(detail.storageCase.id).toBe(created.id);
    expect(detail.locations.length).toBeGreaterThan(0);
  });
});
