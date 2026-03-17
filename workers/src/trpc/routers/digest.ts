import { createDrizzle } from "../../db/client";
import { router, publicProcedure } from "../index";
import {
  listDigestsInputSchema,
  markDigestReadInputSchema,
} from "../lib/schemas";
import { TEMP_USER_ID } from "../lib/d1-helpers";
import * as digestService from "../../services/digest-service";
import { throwIfError } from "../../services/types";

export const digestRouter = router({
  latest: publicProcedure.query(async ({ ctx }) =>
    throwIfError(
      await digestService.getLatestDigest({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: TEMP_USER_ID,
        logger: ctx.logger,
      }),
    ),
  ),

  list: publicProcedure
    .input(listDigestsInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await digestService.listDigests({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: TEMP_USER_ID,
          limit: input.limit,
          logger: ctx.logger,
        }),
      ),
    ),

  markRead: publicProcedure
    .input(markDigestReadInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await digestService.markAsRead({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: TEMP_USER_ID,
          logger: ctx.logger,
        }),
      ),
    ),

  hasUnread: publicProcedure.query(async ({ ctx }) =>
    throwIfError(
      await digestService.checkUnreadDigest({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: TEMP_USER_ID,
        logger: ctx.logger,
      }),
    ),
  ),

  generate: publicProcedure.mutation(async ({ ctx }) =>
    throwIfError(
      await digestService.generateDigestForUser({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: TEMP_USER_ID,
        logger: ctx.logger,
      }),
    ),
  ),
});
