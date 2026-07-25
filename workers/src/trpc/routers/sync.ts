import { createDrizzle } from "../../db/client";
import * as syncService from "../../services/sync-service";
import { throwIfError } from "../../services/types";
import { syncPushInputSchema } from "../../lib/schemas";
import { router, protectedProcedure } from "../index";

export const syncRouter = router({
  push: protectedProcedure
    .input(syncPushInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await syncService.push({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          items: input.items,
          logger: ctx.logger,
        }),
      ),
    ),

  pull: protectedProcedure.query(async ({ ctx }) =>
    throwIfError(
      await syncService.pull({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: ctx.userId,
        logger: ctx.logger,
      }),
    ),
  ),
});
