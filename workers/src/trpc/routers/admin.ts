import { createDrizzle } from "../../db/client";
import { adminProcedure, router } from "../index";
import {
  adminFreezeInputSchema,
  adminListAuditsInputSchema,
  adminListUsersInputSchema,
  adminUserDataInputSchema,
  adminUserDataPagedInputSchema,
  adminUserDetailInputSchema,
} from "../../lib/schemas";
import * as adminService from "../../services/admin-service";
import { throwIfError } from "../../services/types";

const usersRouter = router({
  list: adminProcedure
    .input(adminListUsersInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await adminService.listUsers({
          drizzleDb: createDrizzle(ctx.env.DB),
          input,
          logger: ctx.logger,
        }),
      ),
    ),

  detail: adminProcedure
    .input(adminUserDetailInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await adminService.getUserDetail({
          drizzleDb: createDrizzle(ctx.env.DB),
          id: input.id,
          logger: ctx.logger,
        }),
      ),
    ),

  freeze: adminProcedure
    .input(adminFreezeInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await adminService.freezeUser({
          drizzleDb: createDrizzle(ctx.env.DB),
          actorUserId: ctx.userId,
          targetUserId: input.targetUserId,
          reason: input.reason,
          logger: ctx.logger,
        }),
      ),
    ),

  unfreeze: adminProcedure
    .input(adminFreezeInputSchema)
    .mutation(async ({ ctx, input }) =>
      throwIfError(
        await adminService.unfreezeUser({
          drizzleDb: createDrizzle(ctx.env.DB),
          actorUserId: ctx.userId,
          targetUserId: input.targetUserId,
          reason: input.reason,
          logger: ctx.logger,
        }),
      ),
    ),
});

const metricsRouter = router({
  summary: adminProcedure.query(async ({ ctx }) =>
    throwIfError(
      await adminService.getMetricsSummary({
        drizzleDb: createDrizzle(ctx.env.DB),
        logger: ctx.logger,
      }),
    ),
  ),
});

const auditsRouter = router({
  list: adminProcedure
    .input(adminListAuditsInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await adminService.listAudits({
          drizzleDb: createDrizzle(ctx.env.DB),
          input,
          logger: ctx.logger,
        }),
      ),
    ),
});

const userDataViewRouter = router({
  garments: adminProcedure
    .input(adminUserDataPagedInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await adminService.getUserGarments({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: input.userId,
          limit: input.limit,
          offset: input.offset,
          logger: ctx.logger,
        }),
      ),
    ),

  locations: adminProcedure
    .input(adminUserDataInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await adminService.getUserLocations({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: input.userId,
          logger: ctx.logger,
        }),
      ),
    ),

  coordinates: adminProcedure
    .input(adminUserDataPagedInputSchema)
    .query(async ({ ctx, input }) =>
      throwIfError(
        await adminService.getUserCoordinates({
          drizzleDb: createDrizzle(ctx.env.DB),
          userId: input.userId,
          limit: input.limit,
          offset: input.offset,
          logger: ctx.logger,
        }),
      ),
    ),
});

export const adminRouter = router({
  users: usersRouter,
  metrics: metricsRouter,
  audits: auditsRouter,
  userDataView: userDataViewRouter,
});
