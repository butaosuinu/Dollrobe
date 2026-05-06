import { describe, it, expect, beforeEach } from "vitest";
import { getOrganizationDigestTool } from "./get-organization-digest";
import { getTestDb, resetDatabase } from "../../test/helpers";
import { buildMcpToolCtx } from "../../test/mcp-helpers";

describe("getOrganizationDigestTool", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns undefined when no digest exists yet", async () => {
    const ctx = buildMcpToolCtx("read");
    const result = await getOrganizationDigestTool.handle({}, ctx);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toBeUndefined();
    // text must remain a string ("null") even though the underlying value is undefined.
    expect(typeof result.content[0]?.text).toBe("string");
    expect(result.content[0]?.text).toBe("null");
  });

  it("accepts omitted arguments (MCP allows undefined params.arguments)", async () => {
    const ctx = buildMcpToolCtx("read");
    const result = await getOrganizationDigestTool.handle(undefined, ctx);

    expect(result.isError).toBeUndefined();
  });
});
