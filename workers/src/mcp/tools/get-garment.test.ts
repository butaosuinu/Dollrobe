import { describe, it, expect, beforeEach } from "vitest";
import { getGarmentTool } from "./get-garment";
import {
  createTestGarmentInput,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("getGarmentTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the garment when it exists", async () => {
    const ctx = buildMcpToolCtx("read");
    const created = await ctx.caller.garment.create(
      createTestGarmentInput({ name: "ターゲット" }),
    );

    const result = await getGarmentTool.handle({ id: created.id }, ctx);

    expect(result.isError).toBeUndefined();
    const garment = result.structuredContent as { name: string };
    expect(garment.name).toBe("ターゲット");
  });

  it("write scope can also call read tools", async () => {
    const ctx = buildMcpToolCtx("write");
    const created = await ctx.caller.garment.create(createTestGarmentInput());
    const result = await getGarmentTool.handle({ id: created.id }, ctx);
    expect(result.isError).toBeUndefined();
  });
});
