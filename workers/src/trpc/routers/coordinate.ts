import { z } from "zod";
import { createDrizzle } from "../../db/client";
import { router, publicProcedure } from "../index";
import {
  listCoordinatesInputSchema,
  createCoordinateInputSchema,
  updateCoordinateInputSchema,
  cuidSchema,
} from "../lib/schemas";
import * as coordinateService from "../../services/coordinate-service";
import { throwIfError } from "../../services/types";
import { TEMP_USER_ID } from "../lib/d1-helpers";

export const coordinateRouter = router({
  list: publicProcedure
    .input(listCoordinatesInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await coordinateService.listCoordinates({
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
        await coordinateService.getCoordinate({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: TEMP_USER_ID,
          logger: ctx.logger,
        }),
      ),
    ),

  create: publicProcedure
    .input(createCoordinateInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await coordinateService.createCoordinate({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  update: publicProcedure
    .input(updateCoordinateInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await coordinateService.updateCoordinate({
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
        await coordinateService.deleteCoordinate({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: TEMP_USER_ID,
          logger: ctx.logger,
        }),
      ),
    ),
});
