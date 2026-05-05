import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { listDollsInputSchema } from "../../trpc/lib/schemas";
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

export const handleListDolls = async (
  input: z.infer<typeof listDollsInputSchema>,
  ctx: ToolContext,
): Promise<CallToolResult> => {
  const log = ctx.logger.child({ tool: "list_dolls" });
  if (!hasScope(ctx.scope, "read")) {
    log.warn("scope denied");
    return errorResult("Forbidden", "FORBIDDEN");
  }
  log.info("tool invoked", { input });
  const result = await safeCall(ctx.caller.doll.list(input));
  if (!result.ok) {
    log.error("tool failed", { error: result.error });
    return toErrorResult(result.error);
  }
  log.info("tool completed", { count: result.value.length });
  return okResult(result.value);
};

export const registerListDolls = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "list_dolls",
    {
      title: "List dolls",
      description: "ユーザーのドール一覧を取得する。bodySize でフィルタ可能。",
      inputSchema: listDollsInputSchema.shape,
    },
    async (input) => await handleListDolls(input, ctx),
  );
};
