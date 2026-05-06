import { describe, it, expect, beforeEach } from "vitest";
import { listStorageCasesTool } from "./list-storage-cases";
import {
  createTestCaseInput,
  getTestDb,
  resetDatabase,
} from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("listStorageCasesTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns the user's storage cases", async () => {
    const ctx = buildMcpToolCtx("read");
    await ctx.caller.location.createCase(createTestCaseInput());

    const result = await listStorageCasesTool.handle({}, ctx);

    expect(result.isError).toBeUndefined();
    const payload = result.structuredContent as {
      readonly cases: ReadonlyArray<{ readonly name: string }>;
    };
    expect(payload.cases).toHaveLength(1);
    expect(payload.cases[0]?.name).toBe("テスト衣装ケース");
  });
});
