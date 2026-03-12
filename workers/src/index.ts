import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import type { TRPCContext } from "./trpc/index";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("/trpc/*", async (c, next) => {
  await trpcServer({
    router: appRouter,
    createContext: (): TRPCContext => ({
      env: c.env,
      honoContext: c,
    }),
  })(c, next);
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
