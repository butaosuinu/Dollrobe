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

const TAG_MIN_LENGTH = 1;
const TAG_MAX_LENGTH = 50;
const TAGS_MIN_ITEMS = 1;
const TAGS_MAX_ITEMS = 20;

const inputSchema = z.object({
  id: cuidSchema,
  tags: z
    .array(z.string().min(TAG_MIN_LENGTH).max(TAG_MAX_LENGTH))
    .min(TAGS_MIN_ITEMS)
    .max(TAGS_MAX_ITEMS),
});

export const handleAddGarmentTags = async (
  input: z.infer<typeof inputSchema>,
  ctx: ToolContext,
): Promise<CallToolResult> => {
  const log = ctx.logger.child({
    tool: "add_garment_tags",
    garmentId: input.id,
  });
  if (!hasScope(ctx.scope, "write")) {
    log.warn("scope denied (write required)");
    return errorResult("Forbidden: write scope required", "FORBIDDEN");
  }
  log.info("tool invoked", { newTagCount: input.tags.length });

  const fetched = await safeCall(ctx.caller.garment.get({ id: input.id }));
  if (!fetched.ok) {
    log.error("fetch failed", { error: fetched.error });
    return toErrorResult(fetched.error);
  }
  const existing = fetched.value;

  const merged = Array.from(new Set([...existing.tags, ...input.tags]));

  const updated = await safeCall(
    ctx.caller.garment.update({ id: input.id, tags: merged }),
  );
  if (!updated.ok) {
    log.error("update failed", { error: updated.error });
    return toErrorResult(updated.error);
  }
  log.info("tags merged", {
    before: existing.tags.length,
    added: input.tags.length,
    after: merged.length,
  });
  return okResult(updated.value);
};

export const registerAddGarmentTags = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "add_garment_tags",
    {
      title: "Add tags to garment",
      description:
        "服に追加タグを付与する（既存タグとマージ、重複は除去）。tags 以外のフィールドは変更しない。",
      inputSchema: inputSchema.shape,
    },
    async (input) => await handleAddGarmentTags(input, ctx),
  );
};
