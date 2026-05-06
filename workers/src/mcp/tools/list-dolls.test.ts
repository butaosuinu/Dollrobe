import { describe, it, expect, beforeEach } from "vitest";
import { listDollsTool } from "./list-dolls";
import { getTestDb, resetDatabase } from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("listDollsTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the user's dolls", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.doll.create({
      name: "テスト DD",
      bodySize: "DD_S",
    });

    const result = await listDollsTool.handle({}, ctx);

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("テスト DD");
  });

  it("returns empty list when user has no dolls", async () => {
    const ctx = buildMcpToolCtx("read");
    const result = await listDollsTool.handle({}, ctx);
    expect(JSON.parse(result.content[0]!.text)).toEqual([]);
  });
});
