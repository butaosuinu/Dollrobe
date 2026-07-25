import { z } from "zod";
import { createDrizzle } from "../../db/client";
import { router, protectedProcedure } from "../index";
import {
  listDollsInputSchema,
  createDollInputSchema,
  updateDollInputSchema,
  cuidSchema,
} from "../../lib/schemas";
import * as dollService from "../../services/doll-service";
import { throwIfError } from "../../services/types";

export const dollRouter = router({
  list: protectedProcedure
    .input(listDollsInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await dollService.listDolls({
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
        await dollService.getDoll({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: ctx.userId,
          logger: ctx.logger,
        }),
      ),
    ),

  create: protectedProcedure
    .input(createDollInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await dollService.createDoll({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  update: protectedProcedure
    .input(updateDollInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await dollService.updateDoll({
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
        await dollService.deleteDoll({
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
