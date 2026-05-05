import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import type { Context as HonoContext } from "hono";
import { handleAddGarmentTags } from "./add-garment-tags";
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

describe("handleAddGarmentTags", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("rejects with FORBIDDEN when scope is read-only", async () => {
    const ctx = buildCtx("read");
    const created = await ctx.caller.garment.create(
      createTestGarmentInput({ tags: ["a"] }),
    );

    const result = await handleAddGarmentTags(
      { id: created.id, tags: ["b"] },
      ctx,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("FORBIDDEN");

    // tags must not be modified
    const reread = await ctx.caller.garment.get({ id: created.id });
    expect([...reread.tags]).toEqual(["a"]);
  });

  it("merges new tags with existing tags and deduplicates", async () => {
    const ctx = buildCtx("write");
    const created = await ctx.caller.garment.create(
      createTestGarmentInput({ tags: ["red", "summer"] }),
    );

    const result = await handleAddGarmentTags(
      { id: created.id, tags: ["summer", "floral"] },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    const updated = result.structuredContent as { tags: string[] };
    expect([...updated.tags].sort()).toEqual(["floral", "red", "summer"]);
  });

  it("preserves non-tag fields (whitelist behaviour)", async () => {
    const ctx = buildCtx("write");
    const created = await ctx.caller.garment.create(
      createTestGarmentInput({
        name: "保護対象ドレス",
        tags: ["original"],
      }),
    );

    await handleAddGarmentTags({ id: created.id, tags: ["new"] }, ctx);

    const reread = await ctx.caller.garment.get({ id: created.id });
    expect(reread.name).toBe("保護対象ドレス");
    expect(reread.category).toBe(created.category);
    expect([...reread.tags].sort()).toEqual(["new", "original"]);
  });

  it("returns isError when garment does not exist", async () => {
    const ctx = buildCtx("write");
    const result = await handleAddGarmentTags(
      { id: "nonexistent-id-12345", tags: ["x"] },
      ctx,
    );
    expect(result.isError).toBe(true);
  });
});
