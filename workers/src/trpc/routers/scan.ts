import { router, publicProcedure } from "../index";
import {
  checkinInputSchema,
  checkoutInputSchema,
  confirmAllInputSchema,
  confirmPartialInputSchema,
  orphanResolveInputSchema,
} from "../lib/schemas";
import { TEMP_USER_ID } from "../lib/d1-helpers";
import * as scanService from "../../services/scan-service";
import { throwIfError } from "../../services/types";

export const scanRouter = router({
  checkin: publicProcedure
    .input(checkinInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.checkin({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          locationId: input.locationId,
          garmentIds: input.garmentIds,
        }),
      ),
    ),

  checkout: publicProcedure
    .input(checkoutInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.checkout({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          garmentId: input.garmentId,
        }),
      ),
    ),

  confirmAll: publicProcedure
    .input(confirmAllInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.confirmAll({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          locationId: input.locationId,
        }),
      ),
    ),

  confirmPartial: publicProcedure
    .input(confirmPartialInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.confirmPartial({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          confirmations: input.confirmations,
        }),
      ),
    ),

  orphanResolve: publicProcedure
    .input(orphanResolveInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.orphanResolve({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          garmentId: input.garmentId,
          resolution: input.resolution,
          locationId: input.locationId,
        }),
      ),
    ),
});
