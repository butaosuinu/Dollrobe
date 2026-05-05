import { env } from "cloudflare:test";
import type { Context as HonoContext } from "hono";
import type { Auth } from "../auth";
import { createMcpCaller } from "../mcp/adapter";
import type { McpScope } from "../mcp/scopes";
import { createStubAuth, createTestLogger, TEST_USER_ID } from "./helpers";

export const createStubHonoContext = (): HonoContext => {
  const headers = new Headers();
  const stub = { req: { raw: { headers } } };
  return stub as unknown as HonoContext;
};

type VerifyFn = (args: { body: { key: string } }) => Promise<unknown>;

export const createApiKeyAuthStub = (verifyApiKey: VerifyFn): Auth => {
  const stub = { api: { verifyApiKey } };
  return stub as unknown as Auth;
};

export const buildMcpToolCtx = (
  scope: McpScope,
  options: { readonly userId?: string } = {},
) => ({
  caller: createMcpCaller({
    env,
    auth: createStubAuth(options.userId ?? TEST_USER_ID),
    honoContext: createStubHonoContext(),
    logger: createTestLogger(),
  }),
  scope,
  logger: createTestLogger(),
});
