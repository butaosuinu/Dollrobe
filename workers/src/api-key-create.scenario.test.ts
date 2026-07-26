import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createAuth } from "./auth";
import { createTestLogger } from "./test/helpers";
import { resolveMcpAuth } from "./mcp/auth";
import { hasScope } from "./mcp/scopes";

const TEST_BASE = "http://localhost:8787";
const AUTH_SCENARIO_TIMEOUT_MS = 30_000;
const createdApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  referenceId: z.string(),
  key: z.string(),
  permissions: z.object({
    all: z.array(z.enum(["read", "write"])),
    mcp: z.array(z.enum(["read", "write"])),
  }),
});

const auth = createAuth({ env, logger: createTestLogger() });

const request = async ({
  path,
  body,
  cookie,
  origin = "http://localhost:3000",
}: {
  readonly path: string;
  readonly body: Record<string, unknown>;
  readonly cookie?: string;
  readonly origin?: string | null;
}): Promise<Response> =>
  await auth.handler(
    new Request(`${TEST_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin === null ? {} : { Origin: origin }),
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
  it(
    "credential ユーザーが権限付き API キーを作成できる",
    async () => {
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
      const body = createdApiKeySchema.parse(await response.json());

      expect({ status: response.status, body }).toMatchObject({
        status: 200,
        body: {
          name: "credential-key",
          referenceId: expect.any(String),
          key: expect.any(String),
          permissions: { all: ["read"], mcp: ["read"] },
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
      const mcpAuth = await resolveMcpAuth({
        auth,
        db: env.DB,
        headers: new Headers({ Authorization: `Bearer ${body.key}` }),
      });
      expect(mcpAuth).toEqual({ userId: body.referenceId, scope: "read" });
      expect(hasScope(mcpAuth?.scope ?? "read", "read")).toBe(true);
      expect(hasScope(mcpAuth?.scope ?? "read", "write")).toBe(false);
    },
    AUTH_SCENARIO_TIMEOUT_MS,
  );

  it(
    "OAuth ユーザーの既存 session でも API キーを作成できる",
    async () => {
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
      const body = createdApiKeySchema.parse(await response.json());

      expect({ status: response.status, body }).toMatchObject({
        status: 200,
        body: {
          name: "oauth-key",
          referenceId: expect.any(String),
          key: expect.any(String),
          permissions: {
            all: ["read", "write"],
            mcp: ["read", "write"],
          },
        },
      });
      const mcpAuth = await resolveMcpAuth({
        auth,
        db: env.DB,
        headers: new Headers({ Authorization: `Bearer ${body.key}` }),
      });
      expect(mcpAuth).toEqual({ userId: body.referenceId, scope: "write" });
    },
    AUTH_SCENARIO_TIMEOUT_MS,
  );

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

  it(
    "許可外の権限や client 指定 userId は 400 で拒否する",
    async () => {
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
    },
    AUTH_SCENARIO_TIMEOUT_MS,
  );

  it(
    "session cookie 付きの不正または欠落 Origin は 403 で拒否する",
    async () => {
      const signUpResponse = await request({
        path: "/api/auth/sign-up/email",
        body: {
          name: "Origin User",
          email: "origin-api-key@example.com",
          password: "password123",
        },
      });
      const cookie = signUpResponse.headers.get("set-cookie")?.split(";")[0];
      expect(cookie).toBeDefined();

      const invalidOriginResponse = await request({
        path: "/api/auth/api-key/create",
        body: {
          name: "invalid-origin-key",
          permissions: { all: ["read"] },
        },
        cookie,
        origin: "https://attacker.example",
      });
      expect(invalidOriginResponse.status).toBe(403);

      const missingOriginResponse = await request({
        path: "/api/auth/api-key/create",
        body: {
          name: "missing-origin-key",
          permissions: { all: ["read"] },
        },
        cookie,
        origin: null,
      });
      expect(missingOriginResponse.status).toBe(403);

      const stored = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM apikey`,
      ).first();
      expect(stored).toEqual({ count: 0 });
    },
    AUTH_SCENARIO_TIMEOUT_MS,
  );

  it(
    "ユーザー削除時に発行済み API キーも失効する",
    async () => {
      const signUpResponse = await request({
        path: "/api/auth/sign-up/email",
        body: {
          name: "Deleted User",
          email: "deleted-api-key@example.com",
          password: "password123",
        },
      });
      const cookie = z
        .string()
        .parse(signUpResponse.headers.get("set-cookie")?.split(";")[0]);
      const createResponse = await request({
        path: "/api/auth/api-key/create",
        body: {
          name: "deleted-user-key",
          permissions: { all: ["read"] },
        },
        cookie,
      });
      const created = createdApiKeySchema.parse(await createResponse.json());

      await auth.api.deleteUser({
        body: { password: "password123" },
        headers: new Headers({ Cookie: cookie }),
      });

      await expect(
        auth.api.verifyApiKey({ body: { key: created.key } }),
      ).resolves.toMatchObject({ valid: false });
      const stored = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM apikey`,
      ).first();
      expect(stored).toEqual({ count: 0 });
    },
    AUTH_SCENARIO_TIMEOUT_MS,
  );
});
