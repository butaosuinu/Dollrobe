import { describe, it, expect, beforeEach } from "vitest";
import { listGarmentsTool } from "./list-garments";
import {
  createTestGarmentInput,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("listGarmentsTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the user's garments as text content (parseable JSON)", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ドレス A" }),
    );
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ドレス B" }),
    );

    const result = await listGarmentsTool.handle({}, ctx);

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
    }>;
    expect(list.map((g) => g.name).sort()).toEqual(["ドレス A", "ドレス B"]);
  });

  it("filters garments by category", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ドレス", category: "dress" }),
    );
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "シャツ", category: "tops" }),
    );

    const result = await listGarmentsTool.handle({ category: "dress" }, ctx);

    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
      category: string;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("ドレス");
  });

  it("returns empty list when no garments exist", async () => {
    const ctx = buildMcpToolCtx("read");
    const result = await listGarmentsTool.handle({}, ctx);

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]!.text)).toEqual([]);
  });

  it("treats omitted arguments as no-filter (MCP allows undefined params.arguments)", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.garment.create(
      createTestGarmentInput({ name: "no-args" }),
    );

    const result = await listGarmentsTool.handle(undefined, ctx);

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{ name: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("no-args");
  });
});
