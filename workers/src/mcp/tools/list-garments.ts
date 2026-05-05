import { listGarmentsInputSchema } from "../../trpc/lib/schemas";
import { defineTool } from "./define-tool";

export const listGarmentsTool = defineTool({
  name: "list_garments",
  title: "List garments",
  description:
    "ユーザーの服一覧を取得する。category / status / dollSize / locationId でフィルタ可能。",
  inputSchema: listGarmentsInputSchema,
  call: async (input, ctx) => await ctx.caller.garment.list(input),
});
