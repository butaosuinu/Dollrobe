import { initTRPC, TRPCError } from "@trpc/server";
import type { Context as HonoContext } from "hono";
import type { Env } from "../types";
import type { Auth } from "../auth";

export type TRPCContext = {
  readonly env: Env;
  readonly honoContext: HonoContext;
  readonly auth: Auth;
};

export type AuthenticatedTRPCContext = TRPCContext & {
  readonly userId: string;
};

const t = initTRPC.context<TRPCContext>().create();

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const session = await ctx.auth.api
    .getSession({
      headers: ctx.honoContext.req.raw.headers,
    })
    .catch(() => undefined);

  // eslint-disable-next-line functional/no-throw-statements -- tRPC requires throwing TRPCError
  if (session == null) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return await next({
    ctx: { ...ctx, userId: session.user.id },
  });
});

export const { router } = t;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
