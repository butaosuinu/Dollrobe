import { z } from "zod";
import { defineTool } from "./define-tool";

export const getOrganizationDigestTool = defineTool({
  name: "get_organization_digest",
  title: "Get organization digest",
  description:
    "週次ダイジェスト（在庫整理の最新サマリ）を取得する。digest.latest と同等。",
  inputSchema: z.object({}),
  call: async (_input, ctx) => await ctx.caller.digest.latest(),
});
