import { initTRPC, TRPCError } from "@trpc/server";
import type { Context as HonoContext } from "hono";
import type { Env } from "../types";
import type { Auth } from "../auth";
import type { Logger } from "../lib/logger";
import { resolveAuthenticatedUserId } from "../lib/auth-resolver";

export type TRPCContext = {
  readonly env: Env;
  readonly honoContext?: HonoContext;
  readonly auth?: Auth;
  readonly logger: Logger;
};

export type AuthenticatedTRPCContext = TRPCContext & {
  readonly userId: string;
};

const t = initTRPC.context<TRPCContext>().create();

const loggingMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  const procedureLogger = ctx.logger.child({ procedure: path, type });

  procedureLogger.info("procedure started");

  const result = await next({ ctx: { ...ctx, logger: procedureLogger } });

  const durationMs = Date.now() - start;
  procedureLogger.info("procedure completed", { durationMs });

  return result;
});

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (ctx.auth === undefined || ctx.honoContext === undefined) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userId = await resolveAuthenticatedUserId({
    auth: ctx.auth,
    headers: ctx.honoContext.req.raw.headers,
  });

  if (userId === undefined) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return await next({
    ctx: { ...ctx, userId },
  });
});

export const { router } = t;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure.use(loggingMiddleware);
export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(authMiddleware);
