import { z } from "zod";
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
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          filters: input,
        }),
      ),
    ),

  get: publicProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.getGarment({
          db: ctx.env.DB,
          id: input.id,
          userId: TEMP_USER_ID,
        }),
      ),
    ),

  create: publicProcedure
    .input(createGarmentInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.createGarment({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          input,
        }),
      ),
    ),

  update: publicProcedure
    .input(updateGarmentInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.updateGarment({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          input,
        }),
      ),
    ),

  delete: publicProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await garmentService.deleteGarment({
          db: ctx.env.DB,
          id: input.id,
          userId: TEMP_USER_ID,
        }),
      ),
    ),
});
