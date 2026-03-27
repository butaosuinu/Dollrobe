import { z } from "zod";
import { createDrizzle } from "../../db/client";
import { router, publicProcedure } from "../index";
import {
  listDollsInputSchema,
  createDollInputSchema,
  updateDollInputSchema,
  cuidSchema,
} from "../lib/schemas";
import * as dollService from "../../services/doll-service";
import { throwIfError } from "../../services/types";
import { TEMP_USER_ID } from "../lib/d1-helpers";

export const dollRouter = router({
  list: publicProcedure
    .input(listDollsInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await dollService.listDolls({
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
        await dollService.getDoll({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: TEMP_USER_ID,
          logger: ctx.logger,
        }),
      ),
    ),

  create: publicProcedure
    .input(createDollInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await dollService.createDoll({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  update: publicProcedure
    .input(updateDollInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await dollService.updateDoll({
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
        await dollService.deleteDoll({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: TEMP_USER_ID,
          bucket: ctx.env.BUCKET,
          r2PublicUrl: ctx.env.R2_PUBLIC_URL,
          logger: ctx.logger,
        }),
      ),
    ),
});
