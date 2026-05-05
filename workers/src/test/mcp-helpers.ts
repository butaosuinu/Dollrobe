import { env } from "cloudflare:test";
import type { Context as HonoContext } from "hono";
import type { Auth } from "../auth";
import { createMcpCaller } from "../mcp/adapter";
import type { McpScope } from "../mcp/scopes";
import { createTestLogger, TEST_USER_ID } from "./helpers";

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
    userId: options.userId ?? TEST_USER_ID,
    logger: createTestLogger(),
  }),
  scope,
  logger: createTestLogger(),
});
