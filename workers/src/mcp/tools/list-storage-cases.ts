import { z } from "zod";
import { defineTool } from "./define-tool";

export const listStorageCasesTool = defineTool({
  name: "list_storage_cases",
  title: "List storage cases",
  description: "ユーザーの収納ケース（衣装ケース）一覧を取得する。",
  inputSchema: z.object({}),
  call: async (_input, ctx) => await ctx.caller.location.listCases(),
});
