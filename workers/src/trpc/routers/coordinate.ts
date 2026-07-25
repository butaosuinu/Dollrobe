import { z } from "zod";
import { createDrizzle } from "../../db/client";
import { router, protectedProcedure } from "../index";
import {
  listCoordinatesInputSchema,
  createCoordinateInputSchema,
  updateCoordinateInputSchema,
  cuidSchema,
} from "../../lib/schemas";
import * as coordinateService from "../../services/coordinate-service";
import { throwIfError } from "../../services/types";

export const coordinateRouter = router({
  list: protectedProcedure
    .input(listCoordinatesInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await coordinateService.listCoordinates({
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
        await coordinateService.getCoordinate({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: ctx.userId,
          logger: ctx.logger,
        }),
      ),
    ),

  create: protectedProcedure
    .input(createCoordinateInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await coordinateService.createCoordinate({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  update: protectedProcedure
    .input(updateCoordinateInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await coordinateService.updateCoordinate({
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
        await coordinateService.deleteCoordinate({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: ctx.userId,
          logger: ctx.logger,
        }),
      ),
    ),
});
