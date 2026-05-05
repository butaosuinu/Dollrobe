import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import type { Context as HonoContext } from "hono";
import { handleGetOrganizationDigest } from "./get-organization-digest";
import { createMcpCaller } from "../adapter";
import {
  createStubAuth,
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

describe("handleGetOrganizationDigest", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("returns undefined when no digest exists yet", async () => {
    const ctx = buildCtx("read");
    const result = await handleGetOrganizationDigest({}, ctx);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toBeUndefined();
  });
});
