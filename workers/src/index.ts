import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import type { TRPCContext } from "./trpc/index";
import type { Env } from "./types";
import { createAuth } from "./auth";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  }),
);

app.all("/api/auth/*", async (c) => {
  const auth = createAuth({ env: c.env });
  return await auth.handler(c.req.raw);
});

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
