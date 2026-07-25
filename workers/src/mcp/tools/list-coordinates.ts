import { listCoordinatesInputSchema } from "../../lib/schemas";
import { defineTool } from "./define-tool";

export const listCoordinatesTool = defineTool({
  name: "list_coordinates",
  title: "List coordinates",
  description:
    "ユーザーのコーデ一覧を取得する。isAiGenerated でフィルタ可能（true: AI 生成のみ, false: 手動作成のみ, 省略: 全件）。updatedAt の降順で返る。",
  inputSchema: listCoordinatesInputSchema,
  call: async (input, ctx) => await ctx.caller.coordinate.list(input),
});
