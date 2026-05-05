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
  });
});
