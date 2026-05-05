import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { handleListGarments } from "./list-garments";
import { createMcpCaller } from "../adapter";
import {
  createStubAuth,
  createTestGarmentInput,
  createTestLogger,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";
import type { Context as HonoContext } from "hono";

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

describe("handleListGarments", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the user's garments as structured content", async () => {
    const ctx = buildCtx("read");
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ドレス A" }),
    );
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ドレス B" }),
    );

    const result = await handleListGarments({}, ctx);

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
    }>;
    expect(list.map((g) => g.name).sort()).toEqual(["ドレス A", "ドレス B"]);
  });

  it("filters garments by category", async () => {
    const ctx = buildCtx("read");
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ドレス", category: "dress" }),
    );
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "シャツ", category: "tops" }),
    );

    const result = await handleListGarments({ category: "dress" }, ctx);

    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
      category: string;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("ドレス");
  });

  it("returns empty list when no garments exist", async () => {
    const ctx = buildCtx("read");
    const result = await handleListGarments({}, ctx);

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]!.text)).toEqual([]);
  });
});
