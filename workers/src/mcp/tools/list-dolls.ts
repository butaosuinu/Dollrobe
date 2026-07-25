import { listDollsInputSchema } from "../../lib/schemas";
import { defineTool } from "./define-tool";

export const listDollsTool = defineTool({
  name: "list_dolls",
  title: "List dolls",
  description: "ユーザーのドール一覧を取得する。bodySize でフィルタ可能。",
  inputSchema: listDollsInputSchema,
  call: async (input, ctx) => await ctx.caller.doll.list(input),
});
