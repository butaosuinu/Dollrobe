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

export const handleGetOrganizationDigest = async (
  _input: z.infer<typeof inputSchema>,
  ctx: ToolContext,
): Promise<CallToolResult> => {
  const log = ctx.logger.child({ tool: "get_organization_digest" });
  if (!hasScope(ctx.scope, "read")) {
    log.warn("scope denied");
    return errorResult("Forbidden", "FORBIDDEN");
  }
  log.info("tool invoked");
  const result = await safeCall(ctx.caller.digest.latest());
  if (!result.ok) {
    log.error("tool failed", { error: result.error });
    return toErrorResult(result.error);
  }
  log.info("tool completed");
  return okResult(result.value);
};

export const registerGetOrganizationDigest = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "get_organization_digest",
    {
      title: "Get organization digest",
      description:
        "週次ダイジェスト（在庫整理の最新サマリ）を取得する。digest.latest と同等。",
      inputSchema: inputSchema.shape,
    },
    async (input) => await handleGetOrganizationDigest(input, ctx),
  );
};
