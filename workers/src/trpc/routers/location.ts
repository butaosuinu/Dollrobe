import { router, publicProcedure } from "../index";
import {
  cuidSchema,
  createCaseInputSchema,
  updateCaseInputSchema,
  createLocationInputSchema,
} from "../lib/schemas";
import { TEMP_USER_ID } from "../lib/d1-helpers";
import * as locationService from "../../services/location-service";
import { throwIfError } from "../../services/types";

export const locationRouter = router({
  listCases: publicProcedure.query(async ({ ctx }) =>
    throwIfError(
      await locationService.listCases({
        db: ctx.env.DB,
        userId: TEMP_USER_ID,
      }),
    ),
  ),

  getCase: publicProcedure.input(cuidSchema).query(async ({ ctx, input: id }) =>
    throwIfError(
      await locationService.getCase({
        db: ctx.env.DB,
        id,
        userId: TEMP_USER_ID,
      }),
    ),
  ),

  createCase: publicProcedure
    .input(createCaseInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.createCase({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          input,
        }),
      ),
    ),

  updateCase: publicProcedure
    .input(updateCaseInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.updateCase({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          input,
        }),
      ),
    ),

  deleteCase: publicProcedure
    .input(cuidSchema)
    .mutation(async ({ ctx, input: id }) =>
      throwIfError(
        await locationService.deleteCase({
          db: ctx.env.DB,
          id,
          userId: TEMP_USER_ID,
        }),
      ),
    ),

  createLocation: publicProcedure
    .input(createLocationInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.createLocation({
          db: ctx.env.DB,
          userId: TEMP_USER_ID,
          input,
        }),
      ),
    ),

  deleteLocation: publicProcedure
    .input(cuidSchema)
    .mutation(async ({ ctx, input: id }) =>
      throwIfError(
        await locationService.deleteLocation({
          db: ctx.env.DB,
          id,
          userId: TEMP_USER_ID,
        }),
      ),
    ),
});
