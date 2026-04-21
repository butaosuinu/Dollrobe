import { createDrizzle } from "../../db/client";
import * as syncService from "../../services/sync-service";
import { throwIfError } from "../../services/types";
import { TEMP_USER_ID } from "../lib/d1-helpers";
import { syncPushInputSchema, syncPullInputSchema } from "../lib/schemas";
import { router, publicProcedure } from "../index";

export const syncRouter = router({
  push: publicProcedure
    .input(syncPushInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await syncService.push({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          items: input.items,
          logger: ctx.logger,
        }),
      ),
    ),

  pull: publicProcedure
    .input(syncPullInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await syncService.pull({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          since: input.since,
          cursor: input.cursor,
          limit: input.limit,
          logger: ctx.logger,
        }),
      ),
    ),
});
