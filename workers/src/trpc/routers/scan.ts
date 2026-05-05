import { router, protectedProcedure } from "../index";
import {
  checkinInputSchema,
  checkoutInputSchema,
  confirmAllInputSchema,
  confirmPartialInputSchema,
  orphanResolveInputSchema,
} from "../lib/schemas";
import { createDrizzle } from "../../db/client";
import * as scanService from "../../services/scan-service";
import { throwIfError } from "../../services/types";

export const scanRouter = router({
  checkin: protectedProcedure
    .input(checkinInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.checkin({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          locationId: input.locationId,
          garmentIds: input.garmentIds,
        }),
      ),
    ),

  checkout: protectedProcedure
    .input(checkoutInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.checkout({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          garmentId: input.garmentId,
        }),
      ),
    ),

  confirmAll: protectedProcedure
    .input(confirmAllInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.confirmAll({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          locationId: input.locationId,
        }),
      ),
    ),

  confirmPartial: protectedProcedure
    .input(confirmPartialInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.confirmPartial({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          locationId: input.locationId,
          confirmations: input.confirmations,
        }),
      ),
    ),

  orphanResolve: protectedProcedure
    .input(orphanResolveInputSchema)
    .mutation(async ({ input, ctx }) =>
      throwIfError(
        await scanService.orphanResolve({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          garmentId: input.garmentId,
          resolution: input.resolution,
          locationId: input.locationId,
        }),
      ),
    ),
});
