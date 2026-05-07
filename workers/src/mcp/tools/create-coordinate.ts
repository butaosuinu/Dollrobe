import { createCoordinateInputSchema } from "../../trpc/lib/schemas";
import { defineTool } from "./define-tool";

const createCoordinateMcpInputSchema = createCoordinateInputSchema.omit({
  isAiGenerated: true,
});

export const createCoordinateTool = defineTool({
  name: "create_coordinate",
  title: "Create coordinate",
  description:
    "新しいコーデを保存する。外部エージェント経由のため isAiGenerated は自動で true に固定される。garmentIds はユーザー所有の服 ID のみ受け付ける。",
  inputSchema: createCoordinateMcpInputSchema,
  call: async (input, ctx) =>
    await ctx.caller.coordinate.create({ ...input, isAiGenerated: true }),
});
