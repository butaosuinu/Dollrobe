import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  okResult,
  toErrorResult,
  errorResult,
  safeCall,
  type CallToolResult,
  type McpCaller,
} from "../adapter";
import { hasScope, type McpScope } from "../scopes";
import type { Logger } from "../../lib/logger";

type ToolContext = {
  readonly caller: McpCaller;
  readonly scope: McpScope;
  readonly logger: Logger;
};

const inputSchema = z.object({});

export const handleListStorageCases = async (
  _input: z.infer<typeof inputSchema>,
  ctx: ToolContext,
): Promise<CallToolResult> => {
  const log = ctx.logger.child({ tool: "list_storage_cases" });
  if (!hasScope(ctx.scope, "read")) {
    log.warn("scope denied");
    return errorResult("Forbidden", "FORBIDDEN");
  }
  log.info("tool invoked");
  const result = await safeCall(ctx.caller.location.listCases());
  if (!result.ok) {
    log.error("tool failed", { error: result.error });
    return toErrorResult(result.error);
  }
  log.info("tool completed", { count: result.value.cases.length });
  return okResult(result.value);
};

export const registerListStorageCases = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "list_storage_cases",
    {
      title: "List storage cases",
      description: "ユーザーの収納ケース（衣装ケース）一覧を取得する。",
      inputSchema: inputSchema.shape,
    },
    async (input) => await handleListStorageCases(input, ctx),
  );
};
