import { env } from "cloudflare:test";
import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import type { Auth } from "./auth";
import type { Env } from "./types";
import type { Logger } from "./lib/logger";
import { createTestLogger } from "./test/helpers";
import { apiKeyRoutes } from "./routes/api-key";

const TEST_BASE = "http://localhost:8787";

type Variables = {
  auth: Auth;
  requestId: string;
  logger: Logger;
};

const auth = createAuth({ env });
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.use("*", async (c, next) => {
  c.set("auth", auth);
  c.set("logger", createTestLogger());
  await next();
});
app.route("/api/auth/api-key", apiKeyRoutes);

const request = async ({
  path,
  body,
  cookie,
}: {
  readonly path: string;
  readonly body: Record<string, unknown>;
  readonly cookie?: string;
}): Promise<Response> =>
  path.startsWith("/api/auth/api-key/")
    ? await app.fetch(
        new Request(`${TEST_BASE}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
            ...(cookie === undefined ? {} : { Cookie: cookie }),
          },
          body: JSON.stringify(body),
        }),
        env,
      )
    : await auth.handler(
        new Request(`${TEST_BASE}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
            ...(cookie === undefined ? {} : { Cookie: cookie }),
          },
          body: JSON.stringify(body),
        }),
      );

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM "apikey"`),
    env.DB.prepare(`DELETE FROM "session"`),
    env.DB.prepare(`DELETE FROM "account"`),
    env.DB.prepare(`DELETE FROM "user"`),
  ]);
});

describe("POST /api/auth/api-key/create", () => {
  it("credential ユーザーが権限付き API キーを作成できる", async () => {
    const signUpResponse = await request({
      path: "/api/auth/sign-up/email",
      body: {
        name: "Credential User",
        email: "credential-api-key@example.com",
        password: "password123",
      },
    });
    expect(signUpResponse.status).toBe(200);
    const cookie = signUpResponse.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeDefined();

    const response = await request({
      path: "/api/auth/api-key/create",
      body: {
        name: "credential-key",
        permissions: { all: ["read"] },
      },
      cookie,
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect({ status: response.status, body }).toMatchObject({
      status: 200,
      body: {
        name: "credential-key",
        referenceId: expect.any(String),
        key: expect.any(String),
        permissions: { all: ["read"] },
      },
    });
    const stored = await env.DB.prepare(
      `SELECT apikey.referenceId, user.email
       FROM apikey
       JOIN user ON user.id = apikey.referenceId
       WHERE apikey.name = ?`,
    )
      .bind("credential-key")
      .first();
    expect(stored).toEqual({
      referenceId: body.referenceId,
      email: "credential-api-key@example.com",
    });
  });

  it("OAuth ユーザーの既存 session でも API キーを作成できる", async () => {
    const signUpResponse = await request({
      path: "/api/auth/sign-up/email",
      body: {
        name: "OAuth User",
        email: "oauth-api-key@example.com",
        password: "password123",
      },
    });
    expect(signUpResponse.status).toBe(200);
    const cookie = signUpResponse.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeDefined();
    await env.DB.prepare(
      `UPDATE "account"
       SET providerId = 'google', accountId = 'google-user', password = NULL
       WHERE userId = (
         SELECT id FROM "user" WHERE email = 'oauth-api-key@example.com'
       )`,
    ).run();

    const response = await request({
      path: "/api/auth/api-key/create",
      body: {
        name: "oauth-key",
        permissions: { all: ["read", "write"] },
      },
      cookie,
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect({ status: response.status, body }).toMatchObject({
      status: 200,
      body: {
        name: "oauth-key",
        referenceId: expect.any(String),
        key: expect.any(String),
        permissions: { all: ["read", "write"] },
      },
    });
  });

  it("session が無い場合は 401 を返す", async () => {
    const response = await request({
      path: "/api/auth/api-key/create",
      body: {
        name: "unauthorized-key",
        permissions: { all: ["read"] },
      },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED_SESSION",
      message: "Unauthorized or invalid session",
    });
  });

  it("許可外の権限や client 指定 userId は 400 で拒否する", async () => {
    const signUpResponse = await request({
      path: "/api/auth/sign-up/email",
      body: {
        name: "Credential User",
        email: "rejected-api-key@example.com",
        password: "password123",
      },
    });
    const cookie = signUpResponse.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeDefined();

    const invalidPermissionResponse = await request({
      path: "/api/auth/api-key/create",
      body: {
        name: "invalid-permission-key",
        permissions: { all: ["admin"] },
      },
      cookie,
    });
    expect(invalidPermissionResponse.status).toBe(400);

    const userIdResponse = await request({
      path: "/api/auth/api-key/create",
      body: {
        name: "forged-owner-key",
        permissions: { all: ["read"] },
        userId: "another-user",
      },
      cookie,
    });
    expect(userIdResponse.status).toBe(400);

    const stored = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM apikey`,
    ).first();
    expect(stored).toEqual({ count: 0 });
  });
});
