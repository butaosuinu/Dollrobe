import type { Context } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Env } from "../types";
import type { Auth } from "../auth";
import type { Logger } from "../lib/logger";
import { createMcpCaller } from "./adapter";
import { resolveMcpAuth } from "./auth";
import { registerAllTools } from "./tools/register-all";

type McpVariables = {
  readonly auth: Auth;
  readonly requestId: string;
  readonly logger: Logger;
};
type McpHonoContext = Context<{
  Bindings: Env;
  Variables: McpVariables;
}>;

const SERVER_NAME = "dollrobe-mcp";
const SERVER_VERSION = "0.1.0";

const HTTP_UNAUTHORIZED = 401;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_INTERNAL_ERROR = 500;

type WaitUntilCtx = { waitUntil: (promise: Promise<unknown>) => void };

const readExecutionCtx = async (
  c: McpHonoContext,
): Promise<WaitUntilCtx | undefined> => {
  const safeRead = async (): Promise<WaitUntilCtx | undefined> =>
    await Promise.resolve(c.executionCtx);
  return await safeRead().catch(() => undefined);
};

const unauthorized = (c: McpHonoContext): Response =>
  c.json(
    {
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    },
    HTTP_UNAUTHORIZED,
  );

const internalError = (c: McpHonoContext): Response =>
  c.json(
    {
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal error" },
      id: null,
    },
    HTTP_INTERNAL_ERROR,
  );

export const mcpHandler = async (c: McpHonoContext): Promise<Response> => {
  const baseLogger = c.get("logger").child({ route: "mcp" });
  const auth = c.get("auth");

  const mcpAuth = await resolveMcpAuth({ auth, headers: c.req.raw.headers });
  if (mcpAuth === undefined) {
    baseLogger.warn("mcp auth rejected");
    return unauthorized(c);
  }

  const requestLogger = baseLogger.child({
    userId: mcpAuth.userId,
    scope: mcpAuth.scope,
  });
  requestLogger.info("mcp request authorized");

  const caller = createMcpCaller({
    env: c.env,
    auth,
    honoContext: c,
    logger: requestLogger,
  });

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  registerAllTools(server, {
    caller,
    scope: mcpAuth.scope,
    logger: requestLogger,
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const connectError = await server
    .connect(transport)
    .catch((error: unknown) => error);
  if (connectError !== undefined) {
    requestLogger.error("mcp transport connect failed", {
      error: connectError,
    });
    return internalError(c);
  }

  const response = await transport
    .handleRequest(c.req.raw)
    .catch((error: unknown) => {
      requestLogger.error("mcp transport failed", { error });
      return internalError(c);
    });

  // Cleanup transport / server in the background. Hono's executionCtx getter
  // throws when no Workers ExecutionContext is attached (e.g. tests using
  // app.request without a vexed context), so guard with a tolerant accessor.
  const cleanup = Promise.allSettled([transport.close(), server.close()]);
  const execCtx = await readExecutionCtx(c);
  if (execCtx !== undefined) {
    execCtx.waitUntil(cleanup);
  } else {
    void cleanup;
  }

  return response;
};

export const mcpMethodNotAllowed = (c: McpHonoContext): Response =>
  c.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null,
    },
    HTTP_METHOD_NOT_ALLOWED,
  );
