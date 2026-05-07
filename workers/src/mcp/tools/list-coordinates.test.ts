import { describe, it, expect, beforeEach } from "vitest";
import { listCoordinatesTool } from "./list-coordinates";
import {
  createTestCoordinateInput,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("listCoordinatesTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the user's coordinates as text content (parseable JSON)", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.coordinate.create(
      createTestCoordinateInput({ name: "コーデ A" }),
    );
    await ctx.caller.coordinate.create(
      createTestCoordinateInput({ name: "コーデ B" }),
    );

    const result = await listCoordinatesTool.handle({}, ctx);

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
    }>;
    expect(list.map((c) => c.name).sort()).toEqual(["コーデ A", "コーデ B"]);
  });

  it("filters coordinates by isAiGenerated=true", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.coordinate.create(
      createTestCoordinateInput({ name: "AI コーデ", isAiGenerated: true }),
    );
    await ctx.caller.coordinate.create(
      createTestCoordinateInput({ name: "手動コーデ", isAiGenerated: false }),
    );

    const result = await listCoordinatesTool.handle(
      { isAiGenerated: true },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
      isAiGenerated: boolean;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("AI コーデ");
    expect(list[0]?.isAiGenerated).toBe(true);
  });

  it("filters coordinates by isAiGenerated=false", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.coordinate.create(
      createTestCoordinateInput({ name: "AI コーデ", isAiGenerated: true }),
    );
    await ctx.caller.coordinate.create(
      createTestCoordinateInput({ name: "手動コーデ", isAiGenerated: false }),
    );

    const result = await listCoordinatesTool.handle(
      { isAiGenerated: false },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{
      name: string;
      isAiGenerated: boolean;
    }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("手動コーデ");
    expect(list[0]?.isAiGenerated).toBe(false);
  });

  it("returns empty list when no coordinates exist", async () => {
    const ctx = buildMcpToolCtx("read");
    const result = await listCoordinatesTool.handle({}, ctx);

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0]!.text)).toEqual([]);
  });

  it("treats omitted arguments as no-filter (MCP allows undefined params.arguments)", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.coordinate.create(
      createTestCoordinateInput({ name: "no-args", isAiGenerated: true }),
    );

    const result = await listCoordinatesTool.handle(undefined, ctx);

    expect(result.isError).toBeUndefined();
    const list = JSON.parse(result.content[0]!.text) as Array<{ name: string }>;
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("no-args");
  });
});
