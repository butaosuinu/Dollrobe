import { initTRPC } from "@trpc/server";
import type { Context as HonoContext } from "hono";
import type { Env } from "../types";

export type TRPCContext = {
  readonly env: Env;
  readonly honoContext: HonoContext;
};

const t = initTRPC.context<TRPCContext>().create();

export const { router } = t;
export const publicProcedure = t.procedure;
