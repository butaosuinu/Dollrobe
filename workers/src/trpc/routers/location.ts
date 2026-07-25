import { createDrizzle } from "../../db/client";
import * as locationService from "../../services/location-service";
import { throwIfError } from "../../services/types";
import { router, protectedProcedure } from "../index";
import {
  cuidSchema,
  createCaseInputSchema,
  updateCaseInputSchema,
  updateLocationInputSchema,
  createLocationInputSchema,
} from "../../lib/schemas";

export const locationRouter = router({
  listCases: protectedProcedure.query(async ({ ctx }) =>
    throwIfError(
      await locationService.listCases({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: ctx.userId,
      }),
    ),
  ),

  getCase: protectedProcedure
    .input(cuidSchema)
    .query(async ({ ctx, input: id }) =>
      throwIfError(
        await locationService.getCase({
          drizzleDb: createDrizzle(ctx.env.DB),
          id,
          userId: ctx.userId,
        }),
      ),
    ),

  createCase: protectedProcedure
    .input(createCaseInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.createCase({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
        }),
      ),
    ),

  updateCase: protectedProcedure
    .input(updateCaseInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.updateCase({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
        }),
      ),
    ),

  deleteCase: protectedProcedure
    .input(cuidSchema)
    .mutation(async ({ ctx, input: id }) =>
      throwIfError(
        await locationService.deleteCase({
          drizzleDb: createDrizzle(ctx.env.DB),
          id,
          userId: ctx.userId,
        }),
      ),
    ),

  updateLocation: protectedProcedure
    .input(updateLocationInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.updateLocation({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
        }),
      ),
    ),

  createLocation: protectedProcedure
    .input(createLocationInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await locationService.createLocation({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
        }),
      ),
    ),

  deleteLocation: protectedProcedure
    .input(cuidSchema)
    .mutation(async ({ ctx, input: id }) =>
      throwIfError(
        await locationService.deleteLocation({
          drizzleDb: createDrizzle(ctx.env.DB),
          id,
          userId: ctx.userId,
        }),
      ),
    ),
});
