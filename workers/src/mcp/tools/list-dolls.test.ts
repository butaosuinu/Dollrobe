import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import type { Context as HonoContext } from "hono";
import { handleListDolls } from "./list-dolls";
import { createMcpCaller } from "../adapter";
import {
  createStubAuth,
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

describe("handleListDolls", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the user's dolls", async () => {
    const ctx = buildCtx("read");
    await ctx.caller.doll.create({
      name: "テスト DD",
      bodySize: "DD_S",
    });

    const result = await handleListDolls({}, ctx);

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("テスト DD");
  });

  it("returns empty list when user has no dolls", async () => {
    const ctx = buildCtx("read");
    const result = await handleListDolls({}, ctx);
    expect(JSON.parse(result.content[0]!.text)).toEqual([]);
  });
});
