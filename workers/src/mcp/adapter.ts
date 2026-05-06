import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "../trpc/index";
import type { TRPCContext } from "../trpc/index";
import { appRouter } from "../trpc/router";
import type { Env } from "../types";
import type { Logger } from "../lib/logger";

const createCaller = createCallerFactory(appRouter);

export type McpCaller = ReturnType<typeof createCaller>;

export const createMcpCaller = ({
  env,
  userId,
  logger,
}: {
  readonly env: Env;
  readonly userId: string;
  readonly logger: Logger;
}): McpCaller => {
  const ctx: TRPCContext = {
    env,
    preAuthenticatedUserId: userId,
    logger: logger.child({ source: "mcp" }),
  };
  return createCaller(ctx);
};

export type CallToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// JSON.stringify(undefined) returns undefined (not a string), which would
// violate MCP TextContent's `text: string` contract; coerce to "null".
const safeStringify = (data: unknown): string =>
  data === undefined ? "null" : JSON.stringify(data);

export const okResult = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: safeStringify(data) }],
  ...(isPlainRecord(data) && { structuredContent: data }),
});

export const errorResult = (
  message: string,
  code?: string,
): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify({ error: message, code }) }],
  isError: true,
});

export const forbiddenResult = (requiredScope: string): CallToolResult =>
  errorResult(`Forbidden: ${requiredScope} scope required`, "FORBIDDEN");

export const toErrorResult = (err: unknown): CallToolResult => {
  if (err instanceof TRPCError) {
    return errorResult(err.message, err.code);
  }
  if (err instanceof Error) {
    return errorResult(err.message);
  }
  return errorResult("Unknown error");
};

export type SafeCallResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: unknown };

const SAFE_CALL_FAILURE_KEY = "__mcpSafeCallFailure" as const;
type FailureBox = {
  readonly [SAFE_CALL_FAILURE_KEY]: true;
  readonly error: unknown;
};

export const safeCall = async <T>(
  promise: Promise<T>,
): Promise<SafeCallResult<T>> => {
  const value: T | FailureBox = await promise.catch(
    (error: unknown): FailureBox => ({
      [SAFE_CALL_FAILURE_KEY]: true,
      error,
    }),
  );
  if (
    value !== null &&
    typeof value === "object" &&
    SAFE_CALL_FAILURE_KEY in value
  ) {
    return { ok: false, error: value.error };
  }
  return { ok: true, value };
};
