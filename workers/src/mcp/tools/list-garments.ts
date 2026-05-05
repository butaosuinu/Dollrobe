import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { listGarmentsInputSchema } from "../../trpc/lib/schemas";
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

export const handleListGarments = async (
  input: z.infer<typeof listGarmentsInputSchema>,
  ctx: ToolContext,
): Promise<CallToolResult> => {
  const log = ctx.logger.child({ tool: "list_garments" });
  if (!hasScope(ctx.scope, "read")) {
    log.warn("scope denied");
    return errorResult("Forbidden", "FORBIDDEN");
  }
  log.info("tool invoked", { input });
  const result = await safeCall(ctx.caller.garment.list(input));
  if (!result.ok) {
    log.error("tool failed", { error: result.error });
    return toErrorResult(result.error);
  }
  log.info("tool completed", { count: result.value.length });
  return okResult(result.value);
};

export const registerListGarments = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "list_garments",
    {
      title: "List garments",
      description:
        "ユーザーの服一覧を取得する。category / status / dollSize / locationId でフィルタ可能。",
      inputSchema: listGarmentsInputSchema.shape,
    },
    async (input) => await handleListGarments(input, ctx),
  );
};
