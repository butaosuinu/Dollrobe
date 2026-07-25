import { z } from "zod";
import { cuidSchema } from "../../lib/schemas";
import { defineTool } from "./define-tool";

const TAG_MIN_LENGTH = 1;
const TAG_MAX_LENGTH = 50;
const TAGS_MIN_ITEMS = 1;
const TAGS_MAX_ITEMS = 20;

export const addGarmentTagsTool = defineTool({
  name: "add_garment_tags",
  title: "Add tags to garment",
  description:
    "服に追加タグを付与する（既存タグとマージ、重複は除去）。tags 以外のフィールドは変更しない。",
  inputSchema: z.object({
    id: cuidSchema,
    tags: z
      .array(z.string().min(TAG_MIN_LENGTH).max(TAG_MAX_LENGTH))
      .min(TAGS_MIN_ITEMS)
      .max(TAGS_MAX_ITEMS),
  }),
  call: async ({ id, tags }, ctx) => {
    const existing = await ctx.caller.garment.get({ id });
    const merged = Array.from(new Set([...existing.tags, ...tags]));
    return await ctx.caller.garment.update({ id, tags: merged });
  },
});
