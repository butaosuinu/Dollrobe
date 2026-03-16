import { z } from "zod";
import { createDrizzle } from "../../db/client";
import { router, publicProcedure } from "../index";
import {
  listGarmentsInputSchema,
  createGarmentInputSchema,
  updateGarmentInputSchema,
  cuidSchema,
} from "../lib/schemas";
import * as garmentService from "../../services/garment-service";
import { throwIfError } from "../../services/types";
import { TEMP_USER_ID } from "../lib/d1-helpers";

export const garmentRouter = router({
  list: publicProcedure
    .input(listGarmentsInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.listGarments({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          filters: input,
          logger: ctx.logger,
        }),
      ),
    ),

  get: publicProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.getGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: TEMP_USER_ID,
          logger: ctx.logger,
        }),
      ),
    ),

  create: publicProcedure
    .input(createGarmentInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.createGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  update: publicProcedure
    .input(updateGarmentInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.updateGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  delete: publicProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.deleteGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: TEMP_USER_ID,
          logger: ctx.logger,
        }),
      ),
    ),
});
