import { env } from "cloudflare:test";
import type { Auth } from "../auth";
import { createMcpCaller } from "../mcp/adapter";
import type { McpScope } from "../mcp/scopes";
import { createTestLogger, TEST_USER_ID } from "./helpers";

type VerifyFn = (args: { body: { key: string } }) => Promise<unknown>;
type GetSessionFn = (args: { headers: Headers }) => Promise<unknown>;

export const createApiKeyAuthStub = (
  verifyApiKey: VerifyFn,
  getSession?: GetSessionFn,
): Auth => {
  const api: { verifyApiKey: VerifyFn; getSession?: GetSessionFn } = {
    verifyApiKey,
  };
  if (getSession !== undefined) {
    api.getSession = getSession;
  }
  return { api } as unknown as Auth;
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
