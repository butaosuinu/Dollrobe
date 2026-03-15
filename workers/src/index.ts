import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { timing } from "hono/timing";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import type { TRPCContext } from "./trpc/index";
import type { Env } from "./types";
import { createAuth } from "./auth";
import type { Auth } from "./auth";
import { createLogger } from "./lib/logger";
import type { Logger, LogLevel } from "./lib/logger";

type Variables = {
  auth: Auth;
  requestId: string;
  logger: Logger;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", requestId());

const isLogLevel = (value: string): value is LogLevel =>
  value === "debug" ||
  value === "info" ||
  value === "warn" ||
  value === "error";

const parseLogLevel = (value: string | undefined): LogLevel => {
  if (value !== undefined && isLogLevel(value)) {
    return value;
  }
  return "info";
};

app.use("*", async (c, next) => {
  const appLogger = createLogger({
    minLevel: parseLogLevel(c.env.LOG_LEVEL),
    baseContext: { requestId: c.get("requestId") },
  });
  c.set("logger", appLogger);
  await next();
});

app.use(
  "*",
  logger((str) => {
    const appLogger = createLogger();
    appLogger.info(str);
  }),
);

app.use("*", timing());

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
      logger: c.get("logger"),
    }),
    onError: ({ error, path }) => {
      const appLogger = c.get("logger");
      appLogger.error("tRPC error", {
        procedure: path,
        code: error.code,
        errorMessage: error.message,
      });
    },
  })(c, next);
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
