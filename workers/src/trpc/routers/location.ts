import { createDrizzle } from "../../db/client";
import * as locationService from "../../services/location-service";
import { throwIfError } from "../../services/types";
import { router, publicProcedure } from "../index";
import { TEMP_USER_ID } from "../lib/d1-helpers";
import {
  cuidSchema,
  createCaseInputSchema,
  updateCaseInputSchema,
  updateLocationInputSchema,
  createLocationInputSchema,
} from "../lib/schemas";

export const locationRouter = router({
  listCases: publicProcedure.query(async ({ ctx }) =>
    throwIfError(
      await locationService.listCases({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: TEMP_USER_ID,
      }),
    ),
  ),

  getCase: publicProcedure.input(cuidSchema).query(async ({ ctx, input: id }) =>
    throwIfError(
      await locationService.getCase({
        drizzleDb: createDrizzle(ctx.env.DB),
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
          drizzleDb: createDrizzle(ctx.env.DB),
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
          drizzleDb: createDrizzle(ctx.env.DB),
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
          drizzleDb: createDrizzle(ctx.env.DB),
          id,
          userId: TEMP_USER_ID,
        }),
      ),
    ),

  updateLocation: publicProcedure
    .input(updateLocationInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.updateLocation({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          input,
        }),
      ),
    ),

  createLocation: publicProcedure
    .input(createLocationInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.createLocation({
          drizzleDb: createDrizzle(ctx.env.DB),
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
          drizzleDb: createDrizzle(ctx.env.DB),
          id,
          userId: TEMP_USER_ID,
        }),
      ),
    ),
});
