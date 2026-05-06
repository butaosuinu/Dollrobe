import { describe, it, expect, beforeEach } from "vitest";
import { getStorageCaseTool } from "./get-storage-case";
import {
  createTestCaseInput,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("getStorageCaseTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the storage case with its locations", async () => {
    const ctx = buildMcpToolCtx("read");
    const created = await ctx.caller.location.createCase(createTestCaseInput());

    const result = await getStorageCaseTool.handle({ id: created.id }, ctx);

    expect(result.isError).toBeUndefined();
    const detail = result.structuredContent as {
      readonly storageCase: { readonly id: string };
      readonly locations: readonly unknown[];
    };
    expect(detail.storageCase.id).toBe(created.id);
    expect(detail.locations.length).toBeGreaterThan(0);
  });
});
