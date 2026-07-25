import { z } from "zod";
import { cuidSchema } from "../../lib/schemas";
import { defineTool } from "./define-tool";

export const getStorageCaseTool = defineTool({
  name: "get_storage_case",
  title: "Get storage case",
  description: "ID で 1 件の収納ケース詳細（含む locations 一覧）を取得する。",
  inputSchema: z.object({ id: cuidSchema }),
  call: async ({ id }, ctx) => await ctx.caller.location.getCase(id),
});
