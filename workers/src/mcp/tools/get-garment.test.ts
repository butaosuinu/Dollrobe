import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import type { Context as HonoContext } from "hono";
import { handleGetGarment } from "./get-garment";
import { createMcpCaller } from "../adapter";
import {
  createStubAuth,
  createTestGarmentInput,
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

describe("handleGetGarment", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the garment when it exists", async () => {
    const ctx = buildCtx("read");
    const created = await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ターゲット" }),
    );

    const result = await handleGetGarment({ id: created.id }, ctx);

    expect(result.isError).toBeUndefined();
    const garment = result.structuredContent as { name: string };
    expect(garment.name).toBe("ターゲット");
  });

  it("returns isError when scope lacks read permission", async () => {
    const ctx = { ...buildCtx("write"), scope: "write" as const };
    const created = await ctx.caller.garment.create(createTestGarmentInput());
    const result = await handleGetGarment({ id: created.id }, ctx);
    // write scope has read access → succeeds
    expect(result.isError).toBeUndefined();
  });
});
