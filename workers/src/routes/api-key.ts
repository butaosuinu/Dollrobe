import { Hono } from "hono";
import { APIError } from "better-auth/api";
import { z } from "zod";
import type { Env } from "../types";
import type { Logger } from "../lib/logger";
import type { Auth } from "../auth";

type Variables = {
  auth: Auth;
  requestId: string;
  logger: Logger;
};

const apiKeyPermissionsSchema = z.union([
  z.object({ all: z.tuple([z.literal("read")]) }).strict(),
  z
    .object({
      all: z.tuple([z.literal("read"), z.literal("write")]),
    })
    .strict(),
]);

const apiKeyCreateBodySchema = z
  .object({
    configId: z.string().optional(),
    name: z.string().optional(),
    expiresIn: z.number().min(1).nullable().optional(),
    prefix: z
      .string()
      .regex(/^[a-zA-Z0-9_\-]+$/v)
      .optional(),
    remaining: z.null().optional(),
    metadata: z.unknown().optional(),
    permissions: apiKeyPermissionsSchema.optional(),
    organizationId: z.string().optional(),
  })
  .strict();

const apiErrorStatusSchema = z.union([
  z.literal(400),
  z.literal(401),
  z.literal(403),
  z.literal(404),
  z.literal(429),
]);

const apiKeyRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

apiKeyRoutes.post("/create", async (c) => {
  const logger = c.get("logger").child({ route: "auth/api-key/create" });
  const rawBody = await c.req.json<unknown>().catch((): undefined => undefined);
  const parsed = apiKeyCreateBodySchema.safeParse(rawBody);

  if (!parsed.success) {
    logger.warn("api key create rejected", {
      status: 400,
      reason: "invalid_request_body",
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
      })),
    });
    return c.json(
      {
        code: "INVALID_API_KEY_CREATE_BODY",
        message: "Invalid API key create request",
      },
      400,
    );
  }

  const auth = c.get("auth");
  const sessionResult = await auth.api
    .getSession({ headers: c.req.raw.headers })
    .catch((error: unknown) => error);

  if (sessionResult instanceof Error) {
    logger.error("api key session lookup failed", { error: sessionResult });
    return c.json(
      {
        code: "SESSION_LOOKUP_FAILED",
        message: "Failed to resolve session",
      },
      500,
    );
  }

  if (sessionResult === null) {
    logger.warn("api key create rejected", {
      status: 401,
      reason: "unauthorized_session",
    });
    return c.json(
      {
        code: "UNAUTHORIZED_SESSION",
        message: "Unauthorized or invalid session",
      },
      401,
    );
  }

  const result = await auth.api
    .createApiKey({
      body: {
        ...parsed.data,
        userId: sessionResult.user.id,
      },
    })
    .catch((error: unknown) => error);

  if (result instanceof APIError) {
    const parsedStatus = apiErrorStatusSchema.safeParse(result.statusCode);
    const status = parsedStatus.success ? parsedStatus.data : 400;
    logger.warn("api key create rejected", {
      status,
      reason: "better_auth_api_error",
      errorCode: result.body?.code,
      errorMessage: result.body?.message,
    });
    return c.json(result.body, status);
  }

  if (result instanceof Error) {
    logger.error("api key create failed", { error: result });
    return c.json(
      {
        code: "API_KEY_CREATE_FAILED",
        message: "Failed to create API key",
      },
      500,
    );
  }

  logger.info("api key created", {
    apiKeyId: result.id,
    userId: sessionResult.user.id,
  });
  return c.json(result);
});

export { apiKeyRoutes };
