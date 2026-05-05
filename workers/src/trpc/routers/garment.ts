import { z } from "zod";
import { createDrizzle } from "../../db/client";
import { router, protectedProcedure } from "../index";
import {
  listGarmentsInputSchema,
  createGarmentInputSchema,
  updateGarmentInputSchema,
  bulkCreateGarmentInputSchema,
  cuidSchema,
} from "../lib/schemas";
import * as garmentService from "../../services/garment-service";
import { throwIfError } from "../../services/types";

export const garmentRouter = router({
  list: protectedProcedure
    .input(listGarmentsInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.listGarments({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          filters: input,
          logger: ctx.logger,
        }),
      ),
    ),

  get: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.getGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: ctx.userId,
          logger: ctx.logger,
        }),
      ),
    ),

  create: protectedProcedure
    .input(createGarmentInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.createGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  bulkCreate: protectedProcedure
    .input(bulkCreateGarmentInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.bulkCreateGarments({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          items: input.items,
          logger: ctx.logger,
        }),
      ),
    ),

  update: protectedProcedure
    .input(updateGarmentInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.updateGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  delete: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.deleteGarment({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: ctx.userId,
          bucket: ctx.env.BUCKET,
          r2PublicUrl: ctx.env.R2_PUBLIC_URL,
          logger: ctx.logger,
        }),
      ),
    ),
});
