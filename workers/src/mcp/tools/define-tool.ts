import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import {
  okResult,
  toErrorResult,
  forbiddenResult,
  safeCall,
  type CallToolResult,
  type McpCaller,
} from "../adapter";
import {
  hasScope,
  TOOL_REQUIRED_SCOPE,
  type McpScope,
  type McpToolName,
} from "../scopes";
import type { Logger } from "../../lib/logger";

export type ToolContext = {
  readonly caller: McpCaller;
  readonly scope: McpScope;
  readonly logger: Logger;
};

type ZodObjectAny = z.ZodObject<z.ZodRawShape>;

export type DefinedTool = {
  readonly handle: (
    input: unknown,
    ctx: ToolContext,
  ) => Promise<CallToolResult>;
  readonly register: (server: McpServer, ctx: ToolContext) => void;
};

export const defineTool = <S extends ZodObjectAny>(spec: {
  readonly name: McpToolName;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: S;
  readonly call: (input: z.infer<S>, ctx: ToolContext) => Promise<unknown>;
}): DefinedTool => {
  const required = TOOL_REQUIRED_SCOPE[spec.name];

  const handle = async (
    input: unknown,
    ctx: ToolContext,
  ): Promise<CallToolResult> => {
    const log = ctx.logger.child({ tool: spec.name });
    if (!hasScope(ctx.scope, required)) {
      log.warn("scope denied", { required });
      return forbiddenResult(required);
    }
    // MCP allows clients to omit `params.arguments`; normalize to {} so that
    // tools with no arguments or only optional fields don't fail validation.
    const parsed = spec.inputSchema.safeParse(input ?? {});
    if (!parsed.success) {
      log.warn("invalid input", { issues: parsed.error.issues });
      return toErrorResult(parsed.error);
    }
    log.info("tool invoked");
    const result = await safeCall(spec.call(parsed.data, ctx));
    if (!result.ok) {
      log.error("tool failed", { error: result.error });
      return toErrorResult(result.error);
    }
    log.info("tool completed");
    return okResult(result.value);
  };

  const register = (server: McpServer, ctx: ToolContext): void => {
    const shape: z.ZodRawShape = spec.inputSchema.shape;
    server.registerTool(
      spec.name,
      {
        title: spec.title,
        description: spec.description,
        inputSchema: shape,
      },
      async (input) => await handle(input, ctx),
    );
  };

  return { handle, register };
};
