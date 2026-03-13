import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import type { TRPCContext } from "./trpc/index";
import type { Env } from "./types";
import { createAuth } from "./auth";
import type { Auth } from "./auth";

type Variables = {
  auth: Auth;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS.split(",");
  const middleware = cors({ origin: origins, credentials: true });
  return await middleware(c, next);
});

app.use("*", async (c, next) => {
  c.set("auth", createAuth({ env: c.env }));
  await next();
});

app.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return await auth.handler(c.req.raw);
});

app.use("/trpc/*", async (c, next) => {
  await trpcServer({
    router: appRouter,
    createContext: (): TRPCContext => ({
      env: c.env,
      honoContext: c,
      auth: c.get("auth"),
    }),
  })(c, next);
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
