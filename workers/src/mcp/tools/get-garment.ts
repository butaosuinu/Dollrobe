import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cuidSchema } from "../../trpc/lib/schemas";
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

const inputSchema = z.object({ id: cuidSchema });

export const handleGetGarment = async (
  input: z.infer<typeof inputSchema>,
  ctx: ToolContext,
): Promise<CallToolResult> => {
  const log = ctx.logger.child({ tool: "get_garment", garmentId: input.id });
  if (!hasScope(ctx.scope, "read")) {
    log.warn("scope denied");
    return errorResult("Forbidden", "FORBIDDEN");
  }
  log.info("tool invoked");
  const result = await safeCall(ctx.caller.garment.get(input));
  if (!result.ok) {
    log.error("tool failed", { error: result.error });
    return toErrorResult(result.error);
  }
  log.info("tool completed");
  return okResult(result.value);
};

export const registerGetGarment = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "get_garment",
    {
      title: "Get garment",
      description: "ID で 1 件の服詳細を取得する。",
      inputSchema: inputSchema.shape,
    },
    async (input) => await handleGetGarment(input, ctx),
  );
};
