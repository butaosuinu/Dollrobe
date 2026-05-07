import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { timing } from "hono/timing";
import { trpcServer } from "@hono/trpc-server";
import { APIError } from "better-auth/api";
import { appRouter } from "./trpc/router";
import type { TRPCContext } from "./trpc/index";
import type { Env } from "./types";
import { createAuth } from "./auth";
import type { Auth } from "./auth";
import { createLogger, DEFAULT_LOG_LEVEL } from "./lib/logger";
import type { Logger, LogLevel } from "./lib/logger";
import { imageRoutes } from "./routes/image";
import * as imageService from "./services/image-service";
import { handleDigestCron } from "./scheduled/digest-cron";
import { handleDigestQueue } from "./queues/digest-consumer";
import { mcpHandler, mcpMethodNotAllowed } from "./mcp/server";

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

// better-auth の setPassword はサーバー内部 API としてのみ提供されており、
// HTTP route が無いため /api/auth/* の handler では 404 になる。
// ここで intercept して auth.api.setPassword をサーバーから呼び出す。
type SetPasswordBody = { readonly newPassword?: unknown };

const isAPIError = (e: unknown): e is APIError => e instanceof APIError;

app.post("/api/auth/set-password", async (c) => {
  const auth = c.get("auth");
  const parsed = await c.req
    .json<SetPasswordBody>()
    .catch((): SetPasswordBody => ({}));
  const newPassword = parsed.newPassword;

  if (typeof newPassword !== "string") {
    return c.json({ message: "newPassword required" }, 400);
  }

  const result = await auth.api
    .setPassword({
      body: { newPassword },
      headers: c.req.raw.headers,
    })
    .catch((e: unknown) => e);

  return isAPIError(result)
    ? c.json({ message: result.body?.message ?? "Failed" }, 400)
    : result instanceof Error
      ? c.json({ message: "Failed" }, 500)
      : c.json({ status: true });
});

// confirmEmail をサーバ側で検証してから better-auth の deleteUser を呼ぶ。
// UI 側のメール再入力チェックだけでは stale state / bypass で意図しない
// 削除が成立し得るため、session.user.email との一致を fail-closed で確認する。
type DeleteUserBody = {
  readonly confirmEmail?: unknown;
  readonly password?: unknown;
};

app.post("/api/auth/delete-user", async (c) => {
  const auth = c.get("auth");
  const parsed = await c.req
    .json<DeleteUserBody>()
    .catch((): DeleteUserBody => ({}));
  const confirmEmail = parsed.confirmEmail;
  const password = parsed.password;

  if (typeof confirmEmail !== "string" || confirmEmail.trim() === "") {
    return c.json({ message: "confirmEmail required" }, 400);
  }

  const session = await auth.api
    .getSession({ headers: c.req.raw.headers })
    .catch((): null => null);

  if (session === null) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  // 大文字小文字差で本人なのに弾かれるのを避けるため、両辺を小文字化して比較
  if (session.user.email.toLowerCase() !== confirmEmail.trim().toLowerCase()) {
    return c.json({ message: "確認メールアドレスが一致しません" }, 403);
  }

  const body = typeof password === "string" ? { password } : {};
  const result = await auth.api
    .deleteUser({
      body,
      headers: c.req.raw.headers,
    })
    .catch((e: unknown) => e);

  return isAPIError(result)
    ? c.json({ message: result.body?.message ?? "Failed" }, 400)
    : result instanceof Error
      ? c.json({ message: "Failed" }, 500)
      : c.json({ status: true });
});

app.all("/api/auth/*", async (c) => {
  const auth = c.get("auth");
  return await auth.handler(c.req.raw);
});

const IMAGE_SERVE_PREFIX = "/api/images/serve/";

app.get("/api/images/serve/*", async (c) => {
  const logger = c.get("logger").child({ route: "image/serve" });
  const key = c.req.path.startsWith(IMAGE_SERVE_PREFIX)
    ? decodeURIComponent(c.req.path.slice(IMAGE_SERVE_PREFIX.length))
    : undefined;

  if (key === undefined || key === "") {
    return c.json({ error: "Key is required" }, 400);
  }

  const result = await imageService.getImage({
    bucket: c.env.BUCKET,
    key,
    logger,
  });

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") {
      return await c.notFound();
    }
    return c.json({ error: result.error.message }, 500);
  }

  c.header("Content-Type", result.data.contentType);
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  c.header("ETag", result.data.httpEtag);
  return c.body(result.data.body);
});

app.route("/api/images", imageRoutes);

app.post("/api/mcp", mcpHandler);
app.get("/api/mcp", mcpMethodNotAllowed);
app.delete("/api/mcp", mcpMethodNotAllowed);

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
