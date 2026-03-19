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
import { createLogger, DEFAULT_LOG_LEVEL } from "./lib/logger";
import type { Logger, LogLevel } from "./lib/logger";
import { imageRoutes } from "./routes/image";
import { handleDigestCron } from "./scheduled/digest-cron";
import { handleDigestQueue } from "./queues/digest-consumer";

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
  return DEFAULT_LOG_LEVEL;
};

app.use("*", async (c, next) => {
  const appLogger = createLogger({
    minLevel: parseLogLevel(c.env.LOG_LEVEL),
    baseContext: { requestId: c.get("requestId") },
  });
  c.set("logger", appLogger);
  await next();
});

app.use("*", async (c, next) => {
  const appLogger = c.get("logger");
  const logMiddleware = logger((str) => {
    appLogger.info(str);
  });
  await logMiddleware(c, next);
});

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

app.route("/api/images", imageRoutes);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c): TRPCContext => ({
      env: c.env,
      honoContext: c,
      auth: c.get("auth"),
      logger: c.get("logger"),
    }),
    onError: ({ error, path, ctx }) => {
      if (ctx !== undefined) {
        ctx.logger.error("tRPC error", {
          procedure: path,
          code: error.code,
          errorMessage: error.message,
        });
      }
    },
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return await app.fetch(request, env, ctx);
  },

  scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): void {
    const cronLogger = createLogger({
      minLevel: parseLogLevel(env.LOG_LEVEL),
      baseContext: { handler: "scheduled", cron: controller.cron },
    });

    ctx.waitUntil(handleDigestCron({ env, logger: cronLogger }));
  },

  async queue(batch: MessageBatch, env: Env): Promise<void> {
    const queueLogger = createLogger({
      minLevel: parseLogLevel(env.LOG_LEVEL),
      baseContext: { handler: "queue", queueName: "digest" },
    });

    await handleDigestQueue({ batch, env, logger: queueLogger });
  },
} satisfies ExportedHandler<Env>;
