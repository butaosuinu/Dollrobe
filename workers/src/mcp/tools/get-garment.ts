import { z } from "zod";
import { cuidSchema } from "../../lib/schemas";
import { defineTool } from "./define-tool";

export const getGarmentTool = defineTool({
  name: "get_garment",
  title: "Get garment",
  description: "ID で 1 件の服詳細を取得する。",
  inputSchema: z.object({ id: cuidSchema }),
  call: async (input, ctx) => await ctx.caller.garment.get(input),
});
