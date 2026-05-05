import { createDrizzle } from "../../db/client";
import { router, protectedProcedure } from "../index";
import {
  listDigestsInputSchema,
  markDigestReadInputSchema,
} from "../lib/schemas";
import * as digestService from "../../services/digest-service";
import { throwIfError } from "../../services/types";

export const digestRouter = router({
  latest: protectedProcedure.query(async ({ ctx }) =>
    throwIfError(
      await digestService.getLatestDigest({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: ctx.userId,
        logger: ctx.logger,
      }),
    ),
  ),

  list: protectedProcedure
    .input(listDigestsInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await digestService.listDigests({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: ctx.userId,
          limit: input.limit,
          logger: ctx.logger,
        }),
      ),
    ),

  markRead: protectedProcedure
    .input(markDigestReadInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await digestService.markAsRead({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          userId: ctx.userId,
          logger: ctx.logger,
        }),
      ),
    ),

  hasUnread: protectedProcedure.query(async ({ ctx }) =>
    throwIfError(
      await digestService.checkUnreadDigest({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: ctx.userId,
        logger: ctx.logger,
      }),
    ),
  ),

  generate: protectedProcedure.mutation(async ({ ctx }) =>
    throwIfError(
      await digestService.generateDigestForUser({
        drizzleDb: createDrizzle(ctx.env.DB),
        userId: ctx.userId,
        logger: ctx.logger,
      }),
    ),
  ),
});
