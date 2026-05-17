import { initTRPC, TRPCError } from "@trpc/server";
import type { Context as HonoContext } from "hono";
import type { Env } from "../types";
import type { Auth } from "../auth";
import type { Logger } from "../lib/logger";
import { resolveAuthenticatedUserId } from "../lib/auth-resolver";
import { createDrizzle } from "../db/client";
import * as adminRepo from "../repositories/admin-repository";

export type TRPCContext = {
  readonly env: Env;
  readonly honoContext?: HonoContext;
  readonly auth?: Auth;
  readonly logger: Logger;
  // 上流ですでに認証が確定している場合 (例: MCP の API キー検証後) に渡す。
  // 値があれば authMiddleware は cookie/Bearer の再評価をスキップし、混在クレデンシャル時の身元なりすましを防ぐ。
  readonly preAuthenticatedUserId?: string;
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
  if (ctx.preAuthenticatedUserId !== undefined) {
    return await next({
      ctx: { ...ctx, userId: ctx.preAuthenticatedUserId },
    });
  }

  if (ctx.auth === undefined || ctx.honoContext === undefined) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const userId = await resolveAuthenticatedUserId({
    auth: ctx.auth,
    db: ctx.env.DB,
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
export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(authMiddleware);

// adminProcedure: protectedProcedure の上に admin 判定 middleware を重ねる。
// session payload には role を載せず、毎リクエスト DB lookup する (確実性優先・
// 100 ユーザー規模なら無視できるコスト)。frozen の二重ガードも兼ねる。
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await adminRepo.findUserById({
    drizzleDb: createDrizzle(ctx.env.DB),
    id: ctx.userId,
    logger: ctx.logger,
  });

  if (user === undefined || user.frozen) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return await next({ ctx: { ...ctx, adminUser: user } });
});
