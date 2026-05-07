import { describe, it, expect, beforeEach } from "vitest";
import { createCoordinateTool } from "./create-coordinate";
import {
  createTestGarmentInput,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("createCoordinateTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("rejects with FORBIDDEN when scope is read-only", async () => {
    const ctx = buildMcpToolCtx("read");

    const result = await createCoordinateTool.handle(
      { name: "no-go", garmentIds: [] },
      ctx,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("FORBIDDEN");

    // DB に書き込まれていないこと
    const list = await ctx.caller.coordinate.list({});
    expect(list).toHaveLength(0);
  });

  it("creates a coordinate with isAiGenerated forced to true", async () => {
    const ctx = buildMcpToolCtx("write");

    const result = await createCoordinateTool.handle(
      { name: "AI コーデ", garmentIds: [], memo: "from agent" },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    const created = result.structuredContent as {
      name: string;
      isAiGenerated: boolean;
      memo: string | undefined;
      garmentIds: readonly string[];
    };
    expect(created.name).toBe("AI コーデ");
    expect(created.isAiGenerated).toBe(true);
    expect(created.memo).toBe("from agent");
    expect([...created.garmentIds]).toEqual([]);
  });

  it("forces isAiGenerated to true even when caller passes false (schema strips it)", async () => {
    const ctx = buildMcpToolCtx("write");

    // Even though `isAiGenerated` is not part of the MCP input schema,
    // an external client may try to pass it. zod strips unknown keys by default,
    // and the call() always overrides with true.
    const result = await createCoordinateTool.handle(
      { name: "trying false", garmentIds: [], isAiGenerated: false },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    const created = result.structuredContent as { isAiGenerated: boolean };
    expect(created.isAiGenerated).toBe(true);
  });

  it("creates a coordinate referencing the user's own garments", async () => {
    const ctx = buildMcpToolCtx("write");
    const garment = await ctx.caller.garment.create(
      createTestGarmentInput({ name: "リボン付きドレス" }),
    );

    const result = await createCoordinateTool.handle(
      { name: "リボンコーデ", garmentIds: [garment.id] },
      ctx,
    );

    expect(result.isError).toBeUndefined();
    const created = result.structuredContent as {
      garmentIds: readonly string[];
      isAiGenerated: boolean;
    };
    expect([...created.garmentIds]).toEqual([garment.id]);
    expect(created.isAiGenerated).toBe(true);
  });

  it("returns isError when garmentIds reference non-existent garments", async () => {
    const ctx = buildMcpToolCtx("write");

    const result = await createCoordinateTool.handle(
      {
        name: "missing-garment",
        garmentIds: ["clxxxxxxxxxxxxxxxxxxxxxxx"],
      },
      ctx,
    );

    expect(result.isError).toBe(true);
  });

  it("returns isError on zod validation failure (empty name)", async () => {
    const ctx = buildMcpToolCtx("write");

    const result = await createCoordinateTool.handle(
      { name: "", garmentIds: [] },
      ctx,
    );

    expect(result.isError).toBe(true);
  });
});
