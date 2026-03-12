import { initTRPC, TRPCError } from "@trpc/server";
import type { Context as HonoContext } from "hono";
import type { Env } from "../types";
import { createAuth } from "../auth";

export type TRPCContext = {
  readonly env: Env;
  readonly honoContext: HonoContext;
};

export type AuthenticatedTRPCContext = TRPCContext & {
  readonly userId: string;
};

const t = initTRPC.context<TRPCContext>().create();

type SessionResult = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>>
>;

function assertSession(
  session: SessionResult | null | undefined,
): asserts session is SessionResult {
  // eslint-disable-next-line functional/no-conditional-statements -- tRPC requires throwing for unauthorized access
  if (session === undefined || session === null) {
    // eslint-disable-next-line functional/no-throw-statements -- tRPC requires throwing TRPCError
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
}

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const auth = createAuth({ env: ctx.env });
  const session = await auth.api
    .getSession({
      headers: ctx.honoContext.req.raw.headers,
    })
    .catch(() => undefined);

  assertSession(session);

  return await next({
    ctx: { ...ctx, userId: session.user.id },
  });
});

export const { router } = t;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
